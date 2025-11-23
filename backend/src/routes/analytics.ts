/**
 * Routes pour les analytics
 */

import { Router } from 'express';
import { queueService, JobType, AnalyticsJobData } from '../services/queueService.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';
import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /api/analytics/track
 * Enregistre un événement analytics
 */
router.post('/track', optionalAuthMiddleware, async (req, res, next) => {
  try {
    const { event, resourceId, metadata } = req.body;
    const userId = req.user?.userId;

    if (!event || typeof event !== 'string') {
      return res.status(400).json({
        error: 'Le champ "event" est requis et doit être une chaîne',
      });
    }

    // Ajouter la tâche à la queue
    await queueService.addJob<AnalyticsJobData>(JobType.ANALYTICS, {
      event,
      userId,
      resourceId,
      metadata: metadata || {},
    });

    res.status(200).json({
      success: true,
      message: 'Événement analytics enregistré',
    });
  } catch (error: any) {
    logger.error('Erreur lors de l\'enregistrement de l\'événement analytics:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/stats
 * Récupère les statistiques analytics
 */
router.get('/stats', optionalAuthMiddleware, async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const { event, days = 7 } = req.query;

    // Récupérer les statistiques depuis Redis
    const stats: {
      totalEvents: number;
      eventsByType: Record<string, number>;
      recentEvents: Array<{ event: string; count: number; date: string }>;
      userEvents?: number;
    } = {
      totalEvents: 0,
      eventsByType: {},
      recentEvents: [],
    };

    // Si un type d'événement spécifique est demandé
    if (event && typeof event === 'string') {
      const datePatterns: string[] = [];
      const now = new Date();
      
      for (let i = 0; i < parseInt(days as string); i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        datePatterns.push(`analytics:${event}:${dateStr}`);
      }

      const counts = await Promise.all(
        datePatterns.map(async (key) => {
          const count = await redis.get(key);
          return {
            event,
            count: parseInt(count || '0'),
            date: key.split(':').pop() || '',
          };
        })
      );

      stats.recentEvents = counts;
      stats.totalEvents = counts.reduce((sum, item) => sum + item.count, 0);
    } else {
      // Récupérer tous les événements (méthode simplifiée)
      // En production, on pourrait utiliser une table PostgreSQL pour les analytics
      stats.totalEvents = 0;
      stats.eventsByType = {};
    }

    if (userId) {
      // TODO: Implémenter les statistiques utilisateur spécifiques
      stats.userEvents = 0;
    }

    res.json(stats);
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des statistiques analytics:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/popular-resources
 * Récupère les ressources les plus consultées
 */
router.get('/popular-resources', async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const days = parseInt((req.query.days as string) || '7');

    // Récupérer les événements de vue de ressources depuis Redis
    const now = new Date();
    const resourceViews: Record<string, number> = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Récupérer tous les clés pour les vues de ressources ce jour-là
      const pattern = `analytics:resource_view:*:${dateStr}`;
      // Note: En production, utiliser SCAN au lieu de KEYS pour les performances
      const keys = await redis.keys(pattern);
      
      for (const key of keys) {
        const parts = key.split(':');
        const resourceId = parts[2]; // Format: analytics:resource_view:{resourceId}:{date}
        const count = parseInt((await redis.get(key)) || '0');
        resourceViews[resourceId] = (resourceViews[resourceId] || 0) + count;
      }
    }

    // Trier et retourner les top ressources
    const popularResources = Object.entries(resourceViews)
      .map(([resourceId, views]) => ({ resourceId, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, parseInt(limit as string));

    res.json(popularResources);
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des ressources populaires:', error);
    next(error);
  }
});

export default router;

