/**
 * Routes pour les analytics
 */

import { Router, Request, Response, NextFunction } from 'express';
import { queueService, JobType, AnalyticsJobData } from '../services/queueService.js';
import { optionalAuthMiddleware } from '../middleware/auth.js';
import { redis } from '../config/redis.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /api/analytics/track
 * Enregistre un événement analytics
 */
router.post('/track', optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { event, resourceId, metadata } = req.body;
    const userId = req.user?.userId;

    if (!event || typeof event !== 'string') {
      res.status(400).json({
        error: 'Le champ "event" est requis et doit être une chaîne',
      });
      return;
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
  } catch (error: unknown) {
    logger.error('Erreur lors de l\'enregistrement de l\'événement analytics:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/stats
 * Récupère les statistiques analytics
 */
router.get('/stats', optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    const { event, days = 7 } = req.query;

    // Récupérer les statistiques depuis Redis
    const stats: {
      totalEvents: number;
      eventsByType: Record<string, number>;
      recentEvents: Array<{ event: string; count: number; date: string }>;
      userEvents?: number;
      userEventsByType?: Record<string, number>;
      userTopResources?: Array<{ resourceId: string | null; views: number }>;
      userActivityByDay?: Array<{ date: string; count: number }>;
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
      // Récupérer les statistiques depuis PostgreSQL pour l'historique long terme
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

      // Compter les événements par type depuis PostgreSQL
      const eventsByType = await prisma.analyticsEvent.groupBy({
        by: ['event'],
        where: {
          createdAt: {
            gte: daysAgo,
          },
        },
        _count: {
          event: true,
        },
      });

      stats.eventsByType = eventsByType.reduce((acc, item) => {
        acc[item.event] = item._count.event;
        return acc;
      }, {} as Record<string, number>);

      // Compter le total
      const totalCount = await prisma.analyticsEvent.count({
        where: {
          createdAt: {
            gte: daysAgo,
          },
        },
      });
      stats.totalEvents = totalCount;

      // Récupérer les événements récents par date
      const recentEventsData = await prisma.analyticsEvent.groupBy({
        by: ['event', 'createdAt'],
        where: {
          createdAt: {
            gte: daysAgo,
          },
        },
        _count: {
          event: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Grouper par date
      const eventsByDate: Record<string, Record<string, number>> = {};
      recentEventsData.forEach((item) => {
        const dateStr = item.createdAt.toISOString().split('T')[0];
        if (!eventsByDate[dateStr]) {
          eventsByDate[dateStr] = {};
        }
        eventsByDate[dateStr][item.event] = (eventsByDate[dateStr][item.event] || 0) + item._count.event;
      });

      // Convertir en format attendu
      stats.recentEvents = Object.entries(eventsByDate).map(([date, events]) => {
        const eventEntries = Object.entries(events);
        return eventEntries.map(([event, count]) => ({
          event,
          count,
          date,
        }));
      }).flat();
    }

    if (userId) {
      // Récupérer les statistiques utilisateur spécifiques depuis PostgreSQL
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

      // Compter les événements par type pour l'utilisateur
      const userEventsByType = await prisma.analyticsEvent.groupBy({
        by: ['event'],
        where: {
          userId,
          createdAt: {
            gte: daysAgo,
          },
        },
        _count: {
          event: true,
        },
      });

      const userEventsByTypeMap = userEventsByType.reduce((acc, item) => {
        acc[item.event] = item._count.event;
        return acc;
      }, {} as Record<string, number>);

      // Compter le total d'événements utilisateur
      const userEventCount = await prisma.analyticsEvent.count({
        where: {
          userId,
          createdAt: {
            gte: daysAgo,
          },
        },
      });

      // Récupérer les ressources les plus consultées par l'utilisateur
      const userResourceViews = await prisma.analyticsEvent.groupBy({
        by: ['resourceId'],
        where: {
          userId,
          event: 'resource_view',
          createdAt: {
            gte: daysAgo,
          },
          resourceId: {
            not: null,
          },
        },
        _count: {
          resourceId: true,
        },
        orderBy: {
          _count: {
            resourceId: 'desc',
          },
        },
        take: 10,
      });

      // Récupérer les statistiques d'activité par jour
      const userActivityByDay = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
        SELECT 
          DATE(created_at) as date,
          COUNT(*)::bigint as count
        FROM analytics_events
        WHERE user_id = ${userId}::uuid
          AND created_at >= ${daysAgo}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;

      stats.userEvents = userEventCount;
      stats.userEventsByType = userEventsByTypeMap;
      stats.userTopResources = userResourceViews.map((item) => ({
        resourceId: item.resourceId,
        views: Number(item._count.resourceId),
      }));
      stats.userActivityByDay = userActivityByDay.map((item) => ({
        date: item.date,
        count: Number(item.count),
      }));
    }

    res.json(stats);
  } catch (error: unknown) {
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
  } catch (error: unknown) {
    logger.error('Erreur lors de la récupération des ressources populaires:', error);
    next(error);
  }
});

/**
 * GET /api/analytics/user/:userId/stats
 * Récupère les statistiques spécifiques d'un utilisateur
 */
router.get('/user/:userId/stats', optionalAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    // Vérifier que l'utilisateur existe
    const user = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!user) {
      res.status(404).json({
        error: 'Utilisateur non trouvé',
      });
      return;
    }

    // Vérifier que l'utilisateur demande ses propres stats ou est admin
    if (req.user?.userId !== userId && req.user?.role !== 'admin') {
      res.status(403).json({
        error: 'Accès refusé',
      });
      return;
    }

    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days as string));

    // Statistiques générales
    const totalEvents = await prisma.analyticsEvent.count({
      where: {
        userId,
        createdAt: {
          gte: daysAgo,
        },
      },
    });

    // Événements par type
    const eventsByType = await prisma.analyticsEvent.groupBy({
      by: ['event'],
      where: {
        userId,
        createdAt: {
          gte: daysAgo,
        },
      },
      _count: {
        event: true,
      },
    });

    // Ressources les plus consultées
    const topResources = await prisma.analyticsEvent.groupBy({
      by: ['resourceId'],
      where: {
        userId,
        event: 'resource_view',
        createdAt: {
          gte: daysAgo,
        },
      },
      _count: {
        resourceId: true,
      },
      orderBy: {
        _count: {
          resourceId: 'desc',
        },
      },
      take: 10,
    });

    // Activité par jour
    const activityByDay = await prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::bigint as count
      FROM analytics_events
      WHERE user_id = ${userId}::uuid
        AND created_at >= ${daysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Statistiques des ressources créées
    const resourcesCreated = await prisma.resource.count({
      where: {
        userId,
        createdAt: {
          gte: daysAgo,
        },
      },
    });

    // Statistiques des ressources sauvegardées
    const resourcesSaved = await prisma.savedResource.count({
      where: {
        userId,
        createdAt: {
          gte: daysAgo,
        },
      },
    });

    // Statistiques des commentaires
    const commentsCreated = await prisma.resourceComment.count({
      where: {
        userId,
        createdAt: {
          gte: daysAgo,
        },
      },
    });

    res.json({
      userId,
      period: {
        days: parseInt(days as string),
        from: daysAgo.toISOString(),
        to: new Date().toISOString(),
      },
      events: {
        total: totalEvents,
        byType: eventsByType.reduce((acc, item) => {
          acc[item.event] = item._count.event;
          return acc;
        }, {} as Record<string, number>),
      },
      topResources: topResources.map(item => ({
        resourceId: item.resourceId,
        views: item._count.resourceId,
      })),
      activityByDay: activityByDay.map(item => ({
        date: item.date,
        count: Number(item.count),
      })),
      content: {
        resourcesCreated,
        resourcesSaved,
        commentsCreated,
      },
    });
  } catch (error: unknown) {
    logger.error('Erreur lors de la récupération des statistiques utilisateur:', error);
    next(error);
  }
});

export default router;


