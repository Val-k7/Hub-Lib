/**
 * Routes pour le monitoring et les métriques
 * Fournit des endpoints pour surveiller la santé de l'application
 */

import express, { Request, Response } from 'express';
import { monitoringService } from '../services/monitoringService.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { strictRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { register } from '../utils/metrics.js';
import { prisma } from '../config/database.js';
import { redis } from '../config/redis.js';

const router = express.Router();

/**
 * @swagger
 * /api/monitoring/health:
 *   get:
 *     summary: Health check détaillé de tous les services
 *     description: Vérifie la santé de PostgreSQL, Redis et autres services
 *     tags: [Monitoring]
 *     responses:
 *       200:
 *         description: Tous les services sont sains
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                 checks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       service:
 *                         type: string
 *                       status:
 *                         type: string
 *                       latency:
 *                         type: number
 *       207:
 *         description: Certains services sont dégradés
 *       503:
 *         description: Un ou plusieurs services sont indisponibles
 */
router.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response) => {
    const healthChecks = await monitoringService.checkHealth();
    const allHealthy = healthChecks.every((check) => check.status === 'healthy');
    const hasUnhealthy = healthChecks.some((check) => check.status === 'unhealthy');

    res.status(hasUnhealthy ? 503 : allHealthy ? 200 : 207).json({
      status: hasUnhealthy ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded',
      checks: healthChecks,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/monitoring/metrics
 * Métriques système détaillées
 */
router.get(
  '/metrics',
  authMiddleware,
  requireRole('admin'),
  strictRateLimit,
  asyncHandler(async (_req: Request, res: Response) => {
    const metrics = await monitoringService.collectSystemMetrics();
    res.json(metrics);
  })
);

/**
 * GET /api/monitoring/prometheus
 * Métriques au format Prometheus (alternative à /metrics)
 */
router.get(
  '/prometheus',
  asyncHandler(async (_req: Request, res: Response) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  })
);

/**
 * GET /api/monitoring/stats
 * Statistiques de l'application
 */
router.get(
  '/stats',
  authMiddleware,
  requireRole('admin'),
  strictRateLimit,
  asyncHandler(async (_req: Request, res: Response) => {
    const [
      totalUsers,
      totalResources,
      totalCollections,
      totalComments,
      totalGroups,
      totalNotifications,
      publicResources,
      privateResources,
    ] = await Promise.all([
      prisma.profile.count(),
      prisma.resource.count(),
      prisma.collection.count(),
      prisma.resourceComment.count(),
      prisma.group.count(),
      prisma.notification.count(),
      prisma.resource.count({ where: { visibility: 'public' } }),
      prisma.resource.count({ where: { visibility: 'private' } }),
    ]);

    // Statistiques Redis
    let redisInfo: Record<string, unknown> = {};
    try {
      const info = await redis.info('stats');
      const stats: Record<string, string> = {};
      info.split('\r\n').forEach((line) => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      });
      redisInfo = stats;
    } catch {
      // Ignorer les erreurs
    }

    res.json({
      database: {
        users: totalUsers,
        resources: {
          total: totalResources,
          public: publicResources,
          private: privateResources,
        },
        collections: totalCollections,
        comments: totalComments,
        groups: totalGroups,
        notifications: totalNotifications,
      },
      redis: redisInfo,
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;

