/**
 * Routes d'administration
 */

import express from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { strictRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// Toutes les routes admin nécessitent l'authentification et le rôle admin
router.use(authMiddleware);
router.use(requireRole('admin'));
router.use(strictRateLimit);

// Schémas de validation
const updateConfigSchema = z.object({
  value: z.any(),
  description: z.string().optional(),
});

/**
 * GET /api/admin/stats
 * Statistiques globales de l'application
 */
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
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
      prisma.resource.count({
        where: { visibility: 'public' },
      }),
      prisma.resource.count({
        where: { visibility: 'private' },
      }),
    ]);

    // Statistiques agrégées
    const stats = {
      users: {
        total: totalUsers,
      },
      resources: {
        total: totalResources,
        public: publicResources,
        private: privateResources,
      },
      collections: {
        total: totalCollections,
      },
      comments: {
        total: totalComments,
      },
      groups: {
        total: totalGroups,
      },
      notifications: {
        total: totalNotifications,
      },
    };

    res.json(stats);
  })
);

/**
 * GET /api/admin/config
 * Récupérer la configuration admin
 */
router.get(
  '/config',
  asyncHandler(async (req, res) => {
    const configs = await prisma.adminConfig.findMany({
      orderBy: {
        key: 'asc',
      },
    });

    // Convertir en objet key-value
    const configMap: Record<string, any> = {};
    configs.forEach((config) => {
      configMap[config.key] = {
        value: config.value,
        description: config.description,
        updatedAt: config.updatedAt,
      };
    });

    res.json(configMap);
  })
);

/**
 * PUT /api/admin/config/:key
 * Mettre à jour une configuration admin
 */
router.put(
  '/config/:key',
  asyncHandler(async (req, res) => {
    const { key } = req.params;
    const data = updateConfigSchema.parse(req.body);

    const config = await prisma.adminConfig.upsert({
      where: { key },
      update: {
        value: data.value,
        description: data.description || undefined,
        updatedAt: new Date(),
      },
      create: {
        key,
        value: data.value,
        description: data.description || null,
      },
    });

    res.json(config);
  })
);

/**
 * GET /api/admin/suggestions
 * Liste des suggestions à modérer
 */
router.get(
  '/suggestions',
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    } else {
      // Par défaut, seulement les suggestions en attente
      where.status = 'pending';
    }

    if (type) {
      where.type = type;
    }

    const [suggestions, total] = await Promise.all([
      prisma.categoryTagSuggestion.findMany({
        where,
        include: {
          suggestedByProfile: {
            select: {
              userId: true,
              username: true,
              fullName: true,
            },
          },
          suggestionVotes: {
            include: {
              profile: {
                select: {
                  userId: true,
                  username: true,
                },
              },
            },
          },
          _count: {
            select: {
              suggestionVotes: true,
            },
          },
        },
        orderBy: [
          { votesCount: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.categoryTagSuggestion.count({ where }),
    ]);

    res.json({
      data: suggestions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

/**
 * PUT /api/admin/suggestions/:id/approve
 * Approuver une suggestion
 */
router.put(
  '/suggestions/:id/approve',
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;

    const suggestion = await prisma.categoryTagSuggestion.findUnique({
      where: { id },
    });

    if (!suggestion) {
      throw new AppError('Suggestion non trouvée', 404, 'SUGGESTION_NOT_FOUND');
    }

    const updated = await prisma.categoryTagSuggestion.update({
      where: { id },
      data: {
        status: 'approved',
        reviewedBy: req.user.userId,
        reviewedAt: new Date(),
      },
    });

    res.json(updated);
  })
);

/**
 * PUT /api/admin/suggestions/:id/reject
 * Rejeter une suggestion
 */
router.put(
  '/suggestions/:id/reject',
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;

    const suggestion = await prisma.categoryTagSuggestion.findUnique({
      where: { id },
    });

    if (!suggestion) {
      throw new AppError('Suggestion non trouvée', 404, 'SUGGESTION_NOT_FOUND');
    }

    const updated = await prisma.categoryTagSuggestion.update({
      where: { id },
      data: {
        status: 'rejected',
        reviewedBy: req.user.userId,
        reviewedAt: new Date(),
      },
    });

    res.json(updated);
  })
);

/**
 * GET /api/admin/users
 * Liste des utilisateurs (avec pagination)
 */
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search as string | undefined;

    const where: any = {};

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.profile.findMany({
        where,
        include: {
          userRole: {
            select: {
              role: true,
            },
          },
          _count: {
            select: {
              resources: true,
              collections: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.profile.count({ where }),
    ]);

    res.json({
      data: users.map((u) => ({
        ...u,
        role: u.userRole?.role,
        resourcesCount: u._count.resources,
        collectionsCount: u._count.collections,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

/**
 * PUT /api/admin/users/:id/role
 * Modifier le rôle d'un utilisateur
 */
router.put(
  '/users/:id/role',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'user'].includes(role)) {
      throw new AppError('Rôle invalide', 400, 'INVALID_ROLE');
    }

    const userRole = await prisma.userRole.upsert({
      where: { userId: id },
      update: {
        role,
      },
      create: {
        userId: id,
        role,
      },
    });

    res.json(userRole);
  })
);

export default router;


