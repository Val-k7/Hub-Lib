/**
 * Service de gestion des sessions Redis
 */

import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

class SessionService {
  private readonly SESSION_PREFIX = 'session:';
  private readonly REFRESH_PREFIX = 'refresh:';
  private readonly USER_SESSIONS_PREFIX = 'user:sessions:';
  private readonly SESSION_TTL = 7 * 24 * 60 * 60; // 7 jours en secondes
  private readonly REFRESH_TTL = 30 * 24 * 60 * 60; // 30 jours en secondes

  /**
   * Crée une nouvelle session
   */
  async createSession(userId: string, refreshToken: string): Promise<void> {
    const sessionKey = `${this.SESSION_PREFIX}${refreshToken}`;
    const refreshKey = `${this.REFRESH_PREFIX}${refreshToken}`;
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;

    const sessionData = {
      userId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + this.REFRESH_TTL * 1000).toISOString(),
    };

    // Stocker la session
    await redis.setex(sessionKey, this.SESSION_TTL, JSON.stringify(sessionData));
    
    // Stocker le refresh token séparément
    await redis.setex(refreshKey, this.REFRESH_TTL, userId);

    // Ajouter à la liste des sessions de l'utilisateur
    await redis.sadd(userSessionsKey, refreshToken);
    await redis.expire(userSessionsKey, this.REFRESH_TTL);

    logger.debug(`Session créée pour l'utilisateur ${userId}`);
  }

  /**
   * Valide une session
   */
  async validateSession(userId: string, refreshToken: string): Promise<boolean> {
    const refreshKey = `${this.REFRESH_PREFIX}${refreshToken}`;
    const storedUserId = await redis.get(refreshKey);

    if (!storedUserId || storedUserId !== userId) {
      return false;
    }

    // Vérifier que la session existe dans la liste de l'utilisateur
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
    const isMember = await redis.sismember(userSessionsKey, refreshToken);

    return isMember === 1;
  }

  /**
   * Met à jour une session (remplace l'ancien refresh token)
   */
  async updateSession(userId: string, oldRefreshToken: string, newRefreshToken: string): Promise<void> {
    // Supprimer l'ancienne session
    await this.deleteSession(userId, oldRefreshToken);

    // Créer la nouvelle session
    await this.createSession(userId, newRefreshToken);
  }

  /**
   * Supprime une session
   */
  async deleteSession(userId: string, refreshToken: string): Promise<void> {
    const sessionKey = `${this.SESSION_PREFIX}${refreshToken}`;
    const refreshKey = `${this.REFRESH_PREFIX}${refreshToken}`;
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;

    // Supprimer la session et le refresh token
    await redis.del(sessionKey);
    await redis.del(refreshKey);

    // Retirer de la liste des sessions de l'utilisateur
    await redis.srem(userSessionsKey, refreshToken);

    logger.debug(`Session supprimée pour l'utilisateur ${userId}`);
  }

  /**
   * Supprime toutes les sessions d'un utilisateur
   */
  async deleteAllUserSessions(userId: string): Promise<void> {
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
    const refreshTokens = await redis.smembers(userSessionsKey);

    if (refreshTokens.length === 0) return;

    // Supprimer toutes les sessions
    for (const refreshToken of refreshTokens) {
      await this.deleteSession(userId, refreshToken);
    }

    logger.info(`Toutes les sessions supprimées pour l'utilisateur ${userId}`);
  }

  /**
   * Récupère toutes les sessions actives d'un utilisateur
   */
  async getUserSessions(userId: string): Promise<string[]> {
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
    return redis.smembers(userSessionsKey);
  }

  /**
   * Vérifie si une session existe
   */
  async sessionExists(refreshToken: string): Promise<boolean> {
    const refreshKey = `${this.REFRESH_PREFIX}${refreshToken}`;
    const exists = await redis.exists(refreshKey);
    return exists === 1;
  }

  /**
   * Prolonge une session
   */
  async extendSession(userId: string, refreshToken: string): Promise<void> {
    if (!(await this.validateSession(userId, refreshToken))) {
      throw new Error('Session invalide');
    }

    const sessionKey = `${this.SESSION_PREFIX}${refreshToken}`;
    const refreshKey = `${this.REFRESH_PREFIX}${refreshToken}`;

    // Prolonger la durée de vie
    await redis.expire(sessionKey, this.SESSION_TTL);
    await redis.expire(refreshKey, this.REFRESH_TTL);
  }

  /**
   * Nettoie les sessions expirées (à exécuter périodiquement)
   */
  async cleanupExpiredSessions(): Promise<number> {
    // Redis supprime automatiquement les clés expirées, mais on peut faire un nettoyage manuel
    const pattern = `${this.REFRESH_PREFIX}*`;
    const keys = await redis.keys(pattern);
    let cleaned = 0;

    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl === -1) {
        // Clé sans expiration, la supprimer
        await redis.del(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`${cleaned} sessions expirées nettoyées`);
    }

    return cleaned;
  }
}

export const sessionService = new SessionService();



