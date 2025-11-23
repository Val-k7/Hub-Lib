/**
 * Service de queue de tâches avec BullMQ
 * Gère les tâches asynchrones (approbations automatiques, envoi d'emails, analytics)
 */

import { Queue, Worker, Job } from 'bullmq';
import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';
import { notificationService } from './notificationService.js';

// Configuration Redis pour BullMQ
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
};

/**
 * Types de tâches
 */
export enum JobType {
  AUTO_APPROVAL = 'auto-approval',
  NOTIFICATION = 'notification',
  ANALYTICS = 'analytics',
  EMAIL = 'email',
  CLEANUP = 'cleanup',
}

/**
 * Données pour une tâche d'approbation automatique
 */
export interface AutoApprovalJobData {
  suggestionId: string;
  threshold: number; // Nombre minimum de votes positifs
}

/**
 * Données pour une tâche de notification
 */
export interface NotificationJobData {
  userId: string;
  type: string;
  title: string;
  message: string;
  resourceId?: string;
  groupId?: string;
}

/**
 * Données pour une tâche d'analytics
 */
export interface AnalyticsJobData {
  event: string;
  userId?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

/**
 * Données pour une tâche d'email
 */
export interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

/**
 * Service de queue
 */
class QueueService {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  /**
   * Initialise toutes les queues
   */
  initialize(): void {
    // Queue d'approbation automatique
    this.createQueue(JobType.AUTO_APPROVAL);
    this.createWorker(JobType.AUTO_APPROVAL, this.processAutoApproval.bind(this));

    // Queue de notifications
    this.createQueue(JobType.NOTIFICATION);
    this.createWorker(JobType.NOTIFICATION, this.processNotification.bind(this));

    // Queue d'analytics
    this.createQueue(JobType.ANALYTICS);
    this.createWorker(JobType.ANALYTICS, this.processAnalytics.bind(this));

    // Queue d'emails (pour le futur)
    this.createQueue(JobType.EMAIL);
    this.createWorker(JobType.EMAIL, this.processEmail.bind(this));

    // Queue de nettoyage
    this.createQueue(JobType.CLEANUP);
    this.createWorker(JobType.CLEANUP, this.processCleanup.bind(this));

    logger.info('Queues initialisées avec succès');
  }

  /**
   * Crée une queue
   */
  private createQueue(name: string): Queue {
    const queue = new Queue(name, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Garder les jobs complétés pendant 24h
          count: 1000, // Garder max 1000 jobs complétés
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Garder les jobs échoués pendant 7 jours
        },
      },
    });

    this.queues.set(name, queue);
    return queue;
  }

  /**
   * Crée un worker pour une queue
   */
  private createWorker(name: string, processor: (job: Job) => Promise<any>): Worker {
    const worker = new Worker(
      name,
      async (job: Job) => {
        logger.debug(`Traitement de la tâche ${name}:${job.id}`);
        return await processor(job);
      },
      {
        connection,
        concurrency: 5, // Traiter 5 tâches en parallèle
        limiter: {
          max: 10,
          duration: 1000, // Max 10 tâches par seconde
        },
      }
    );

    worker.on('completed', (job) => {
      logger.debug(`Tâche ${name}:${job.id} complétée`);
    });

    worker.on('failed', (job, err) => {
      logger.error(`Tâche ${name}:${job?.id} échouée:`, err);
    });

    this.workers.set(name, worker);
    return worker;
  }

  /**
   * Ajoute une tâche à une queue
   */
  async addJob<T = any>(type: JobType, data: T, options?: { delay?: number; priority?: number }): Promise<Job> {
    const queue = this.queues.get(type);
    if (!queue) {
      throw new Error(`Queue ${type} n'existe pas`);
    }

    const job = await queue.add(type, data, {
      delay: options?.delay,
      priority: options?.priority,
    });

    logger.debug(`Tâche ${type} ajoutée: ${job.id}`);
    return job;
  }

  /**
   * Traite une tâche d'approbation automatique
   */
  private async processAutoApproval(job: Job<AutoApprovalJobData>): Promise<void> {
    const { suggestionId, threshold } = job.data;

    // Récupérer la suggestion
    const suggestion = await prisma.categoryTagSuggestion.findUnique({
      where: { id: suggestionId },
      include: {
        votes: true,
      },
    });

    if (!suggestion) {
      throw new Error(`Suggestion ${suggestionId} introuvable`);
    }

    // Si déjà approuvée ou rejetée, ne rien faire
    if (suggestion.status !== 'pending') {
      return;
    }

    // Compter les votes positifs
    const positiveVotes = suggestion.votes.filter((v) => v.voteType === 'upvote').length;
    const negativeVotes = suggestion.votes.filter((v) => v.voteType === 'downvote').length;

    // Si le seuil est atteint, approuver automatiquement
    if (positiveVotes >= threshold && positiveVotes > negativeVotes) {
      await prisma.categoryTagSuggestion.update({
        where: { id: suggestionId },
        data: { status: 'approved' },
      });

      logger.info(`Suggestion ${suggestionId} approuvée automatiquement (${positiveVotes} votes)`);

      // Notifier l'auteur de la suggestion
      if (suggestion.userId) {
        await notificationService.createNotification({
          userId: suggestion.userId,
          type: 'suggestion_approved',
          title: 'Suggestion approuvée',
          message: `Votre suggestion "${suggestion.name}" a été approuvée automatiquement`,
        });
      }
    }
  }

  /**
   * Traite une tâche de notification
   */
  private async processNotification(job: Job<NotificationJobData>): Promise<void> {
    const data = job.data;
    await notificationService.createNotification(data);
  }

  /**
   * Traite une tâche d'analytics
   */
  private async processAnalytics(job: Job<AnalyticsJobData>): Promise<void> {
    const { event, userId, resourceId, metadata } = job.data;

    // Log l'événement
    logger.info(`Analytics: ${event}`, {
      userId,
      resourceId,
      metadata,
      timestamp: new Date().toISOString(),
    });

    // Incrémenter les compteurs dans Redis
    const dateStr = new Date().toISOString().split('T')[0];
    
    // Compteur global pour le type d'événement et la date
    const globalKey = `analytics:${event}:${dateStr}`;
    await redis.incr(globalKey);
    await redis.expire(globalKey, 30 * 24 * 3600); // Expire après 30 jours

    // Si c'est un événement lié à une ressource, créer une clé spécifique
    if (resourceId && (event === 'resource_view' || event === 'resource_download' || event === 'resource_click')) {
      const resourceKey = `analytics:${event}:${resourceId}:${dateStr}`;
      await redis.incr(resourceKey);
      await redis.expire(resourceKey, 30 * 24 * 3600); // Expire après 30 jours
    }

    // Si c'est un événement utilisateur, créer une clé spécifique
    if (userId) {
      const userKey = `analytics:${event}:user:${userId}:${dateStr}`;
      await redis.incr(userKey);
      await redis.expire(userKey, 30 * 24 * 3600); // Expire après 30 jours
    }

    // TODO: En production, on pourrait aussi stocker dans PostgreSQL pour l'historique long terme
  }

  /**
   * Traite une tâche d'email (placeholder pour le futur)
   */
  private async processEmail(job: Job<EmailJobData>): Promise<void> {
    const { to, subject, template, data } = job.data;

    // TODO: Implémenter l'envoi d'emails
    logger.info(`Email à envoyer à ${to}: ${subject}`, { template, data });
  }

  /**
   * Traite une tâche de nettoyage
   */
  private async processCleanup(job: Job): Promise<void> {
    logger.info('Démarrage du nettoyage périodique');

    // Nettoyer les sessions expirées
    // (Redis le fait automatiquement, mais on peut vérifier)

    // Nettoyer les notifications anciennes (plus de 90 jours)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const deleted = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: ninetyDaysAgo,
        },
        isRead: true,
      },
    });

    logger.info(`${deleted.count} notifications anciennes supprimées`);
  }

  /**
   * Obtient une queue
   */
  getQueue(type: JobType): Queue | undefined {
    return this.queues.get(type);
  }

  /**
   * Obtient les statistiques d'une queue
   */
  async getQueueStats(type: JobType): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const queue = this.queues.get(type);
    if (!queue) {
      throw new Error(`Queue ${type} n'existe pas`);
    }

    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }

  /**
   * Nettoie toutes les queues (arrêt propre)
   */
  async close(): Promise<void> {
    // Fermer tous les workers
    for (const [name, worker] of this.workers.entries()) {
      await worker.close();
      logger.info(`Worker ${name} fermé`);
    }

    // Fermer toutes les queues
    for (const [name, queue] of this.queues.entries()) {
      await queue.close();
      logger.info(`Queue ${name} fermée`);
    }

    this.queues.clear();
    this.workers.clear();
  }
}

export const queueService = new QueueService();


