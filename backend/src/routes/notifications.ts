/**
 * Routes pour les notifications
 */

import express from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { notificationService } from '../services/notificationService.js';

const router = express.Router();

// Schémas de validation
const notificationFiltersSchema = z.object({
  isRead: z.enum(['true', 'false']).optional(),
  type: z.string().optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional().default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional().default('20'),
});

/**
 * GET /api/notifications
 * Liste des notifications de l'utilisateur
 */
router.get(
  '/',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const filters = notificationFiltersSchema.parse(req.query);
    const skip = (filters.page - 1) * filters.limit;

    const where: any = {
      userId: req.user.userId,
    };

    if (filters.isRead) {
      where.isRead = filters.isRead === 'true';
    }

    if (filters.type) {
      where.type = filters.type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: {
          resource: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: filters.limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          userId: req.user.userId,
          isRead: false,
        },
      }),
    ]);

    res.json({
      data: notifications,
      meta: {
        total,
        unreadCount,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  })
);

/**
 * GET /api/notifications/unread-count
 * Nombre de notifications non lues
 */
router.get(
  '/unread-count',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const count = await prisma.notification.count({
      where: {
        userId: req.user.userId,
        isRead: false,
      },
    });

    res.json({ count });
  })
);

/**
 * PUT /api/notifications/:id/read
 * Marquer une notification comme lue
 */
router.put(
  '/:id/read',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;

    // Vérifier que la notification existe et appartient à l'utilisateur
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new AppError('Notification non trouvée', 404, 'NOTIFICATION_NOT_FOUND');
    }

    if (notification.userId !== req.user.userId && req.user.role !== 'admin') {
      throw new AppError('Cette notification ne vous appartient pas', 403, 'NOT_OWNER');
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
      },
    });

    res.json(updated);
  })
);

/**
 * PUT /api/notifications/read-all
 * Marquer toutes les notifications comme lues
 */
router.put(
  '/read-all',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const result = await prisma.notification.updateMany({
      where: {
        userId: req.user.userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    res.json({
      message: 'Toutes les notifications ont été marquées comme lues',
      count: result.count,
    });
  })
);

/**
 * DELETE /api/notifications/:id
 * Supprimer une notification
 */
router.delete(
  '/:id',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;

    // Vérifier que la notification existe et appartient à l'utilisateur
    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new AppError('Notification non trouvée', 404, 'NOTIFICATION_NOT_FOUND');
    }

    if (notification.userId !== req.user.userId && req.user.role !== 'admin') {
      throw new AppError('Cette notification ne vous appartient pas', 403, 'NOT_OWNER');
    }

    await prisma.notification.delete({
      where: { id },
    });

    res.status(204).send();
  })
);

export default router;


