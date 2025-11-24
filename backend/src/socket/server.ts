/**
 * Serveur WebSocket avec Socket.IO
 * Gère les connexions temps réel et la communication via Redis Pub/Sub
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis } from '../config/redis.js';
import { redisSubscriber } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { authService } from '../services/authService.js';

export interface SocketAuth {
  userId: string;
  email: string;
}

/**
 * Interface pour les données d'authentification Socket
 */
interface SocketData {
  auth?: SocketAuth;
}

/**
 * Initialise le serveur Socket.IO
 */
export function initializeSocketServer(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer<{}, {}, {}, SocketData>(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Configurer l'adapter Redis pour la communication entre instances
  io.adapter(createAdapter(redis, redisSubscriber));
  logger.info('✅ Socket.IO Redis adapter configuré');

  // Middleware d'authentification
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token || typeof token !== 'string') {
        return next(new Error('Token d\'authentification manquant'));
      }

      // Vérifier le token JWT via authService
      const payload = authService.verifyAccessToken(token);

      if (!payload || !payload.userId) {
        return next(new Error('Token invalide'));
      }

      // Récupérer les informations complètes de l'utilisateur
      const user = await authService.getUserById(payload.userId);

      if (!user) {
        return next(new Error('Utilisateur introuvable'));
      }

      // Stocker les informations d'authentification dans les données du socket
      socket.data.auth = {
        userId: user.userId,
        email: user.email,
      };

      logger.debug(`✅ Socket authentifié pour l'utilisateur ${user.userId}`);
      next();
    } catch (error: any) {
      logger.error(`❌ Erreur d'authentification Socket: ${error.message}`);
      next(new Error('Authentification échouée'));
    }
  });

  // Gestion des connexions
  io.on('connection', (socket) => {
    const userId = socket.data.auth?.userId;

    if (!userId) {
      socket.disconnect();
      return;
    }

    logger.info(`🔌 Socket connecté: ${socket.id} (User: ${userId})`);

    // Rejoindre la room de l'utilisateur pour les notifications personnelles
    socket.join(`user:${userId}`);

    // Gestion de la souscription aux canaux
    (socket as any).on('subscribe', async (channel: string) => {
      try {
        // Valider le canal (sécurité)
        if (!isValidChannel(channel, userId)) {
          (socket as any).emit('error', { message: 'Canal non autorisé' });
          return;
        }

        socket.join(channel);
        logger.debug(`📡 Socket ${socket.id} s'est abonné au canal ${channel}`);
        (socket as any).emit('subscribed', { channel });
      } catch (error: any) {
        logger.error(`Erreur lors de la souscription: ${error.message}`);
        (socket as any).emit('error', { message: 'Erreur lors de la souscription' });
      }
    });

    // Gestion du désabonnement
    (socket as any).on('unsubscribe', (channel: string) => {
      socket.leave(channel);
      logger.debug(`📡 Socket ${socket.id} s'est désabonné du canal ${channel}`);
      (socket as any).emit('unsubscribed', { channel });
    });

    // Écouter les mises à jour de ressources
    (socket as any).on('subscribe:resource', (resourceId: string) => {
      if (!resourceId || typeof resourceId !== 'string') {
        return;
      }
      const channel = `resource:updates:${resourceId}`;
      socket.join(channel);
      logger.debug(`📡 Socket ${socket.id} s'est abonné aux mises à jour de la ressource ${resourceId}`);
    });

    // Écouter les votes sur suggestions
    (socket as any).on('subscribe:suggestions', () => {
      socket.join('suggestions:votes');
      logger.debug(`📡 Socket ${socket.id} s'est abonné aux votes de suggestions`);
    });

    // Gestion de la déconnexion
    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Socket déconnecté: ${socket.id} (Raison: ${reason})`);
    });

    // Gestion des erreurs
    socket.on('error', (error) => {
      logger.error(`❌ Erreur Socket ${socket.id}:`, error);
    });
  });

  // Écouter les publications Redis et les diffuser via Socket.IO
  setupRedisSubscriptions(io);

  logger.info('✅ Serveur Socket.IO initialisé');
  return io;
}

/**
 * Valide qu'un canal peut être accédé par l'utilisateur
 */
function isValidChannel(channel: string, userId: string): boolean {
  // Permettre les canaux de notifications personnelles
  if (channel === `notifications:${userId}` || channel === `user:${userId}`) {
    return true;
  }

  // Permettre les canaux de ressources (lecture seule)
  if (channel.startsWith('resource:updates:')) {
    return true;
  }

  // Permettre les canaux de suggestions (lecture seule)
  if (channel === 'suggestions:votes') {
    return true;
  }

  return false;
}

/**
 * Configure les abonnements Redis et les diffuse via Socket.IO
 */
function setupRedisSubscriptions(io: SocketIOServer) {
  // Utiliser le subscriber Redis existant
  const subscriber = redisSubscriber;

  // S'abonner aux notifications
  subscriber.psubscribe('notifications:*', (err, count) => {
    if (err) {
      logger.error('Erreur lors de l\'abonnement aux notifications:', err);
    } else {
      logger.info(`📡 Abonné à ${count} canaux de notifications`);
    }
  });

  // S'abonner aux mises à jour de ressources
  subscriber.psubscribe('resource:updates:*', (err, count) => {
    if (err) {
      logger.error('Erreur lors de l\'abonnement aux mises à jour de ressources:', err);
    } else {
      logger.info(`📡 Abonné à ${count} canaux de mises à jour de ressources`);
    }
  });

  // S'abonner aux votes sur suggestions
  subscriber.subscribe('suggestions:votes', (err) => {
    if (err) {
      logger.error('Erreur lors de l\'abonnement aux votes:', err);
    } else {
      logger.info(`📡 Abonné au canal de votes de suggestions`);
    }
  });

  // Écouter les messages Redis et les diffuser via Socket.IO
  subscriber.on('pmessage', (pattern, channel, message) => {
    try {
      const data = JSON.parse(message);

      // Extraire l'ID utilisateur depuis le canal de notifications
      if (pattern === 'notifications:*') {
        const userId = channel.replace('notifications:', '');
        io.to(`user:${userId}`).emit('notification', data);
        logger.debug(`📨 Notification envoyée à l'utilisateur ${userId}`);
      }

      // Diffuser les mises à jour de ressources
      if (pattern === 'resource:updates:*') {
        const resourceId = channel.replace('resource:updates:', '');
        io.to(`resource:updates:${resourceId}`).emit('resource:update', data);
        logger.debug(`📨 Mise à jour de ressource ${resourceId} diffusée`);
      }
    } catch (error: any) {
      logger.error(`Erreur lors du traitement du message Redis: ${error.message}`);
    }
  });

  subscriber.on('message', (channel, message) => {
    try {
      const data = JSON.parse(message);

      // Diffuser les votes sur suggestions
      if (channel === 'suggestions:votes') {
        io.to('suggestions:votes').emit('suggestion:vote', data);
        logger.debug(`📨 Vote sur suggestion diffusé`);
      }
    } catch (error: any) {
      logger.error(`Erreur lors du traitement du message Redis: ${error.message}`);
    }
  });

  logger.info('✅ Abonnements Redis configurés pour Socket.IO');
}

