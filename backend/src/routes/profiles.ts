/**
 * Routes pour les profils utilisateurs
 */

import express from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { cacheService } from '../services/cacheService.js';

const router = express.Router();

// Schémas de validation
const updateProfileSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  fullName: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  githubUsername: z.string().max(100).optional().nullable(),
  preferredLayout: z.string().optional().nullable(),
});

/**
 * GET /api/profiles/:id
 * Récupérer un profil utilisateur
 */
router.get(
  '/:id',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Récupérer depuis le cache
    const cacheKey = `profile:${id}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: id },
      include: {
        userRole: {
          select: {
            role: true,
          },
        },
      },
    });

    if (!profile) {
      throw new AppError('Profil non trouvé', 404, 'PROFILE_NOT_FOUND');
    }

    // Ne pas exposer certaines infos sensibles
    const publicProfile = {
      id: profile.id,
      userId: profile.userId,
      username: profile.username,
      fullName: profile.fullName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      githubUsername: profile.githubUsername,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      role: profile.userRole?.role,
    };

    // Mettre en cache (30 minutes)
    await cacheService.set(cacheKey, publicProfile, { ttl: 1800 });

    res.json(publicProfile);
  })
);

/**
 * GET /api/profiles/:id/resources
 * Récupérer les ressources d'un utilisateur
 */
router.get(
  '/:id/resources',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      userId: id,
    };

    // Si l'utilisateur ne demande pas ses propres ressources, seulement publiques
    if (!req.user || req.user.userId !== id) {
      where.visibility = 'public';
    }

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        include: {
          profile: {
            select: {
              userId: true,
              username: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.resource.count({ where }),
    ]);

    res.json({
      data: resources,
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
 * GET /api/profiles/:id/stats
 * Récupérer les statistiques d'un utilisateur
 */
router.get(
  '/:id/stats',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Vérifier que le profil existe
    const profile = await prisma.profile.findUnique({
      where: { userId: id },
    });

    if (!profile) {
      throw new AppError('Profil non trouvé', 404, 'PROFILE_NOT_FOUND');
    }

    // Cache key
    const cacheKey = `profile:${id}:stats`;

    // Récupérer depuis le cache si possible
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // Calculer les statistiques
    const [
      totalResources,
      publicResources,
      totalViews,
      totalDownloads,
      totalRatings,
      averageRating,
      savedCount,
    ] = await Promise.all([
      // Total de ressources
      prisma.resource.count({
        where: { userId: id },
      }),
      // Ressources publiques
      prisma.resource.count({
        where: {
          userId: id,
          visibility: 'public',
        },
      }),
      // Total de vues
      prisma.resource.aggregate({
        where: { userId: id },
        _sum: {
          viewsCount: true,
        },
      }),
      // Total de téléchargements
      prisma.resource.aggregate({
        where: { userId: id },
        _sum: {
          downloadsCount: true,
        },
      }),
      // Total de notes
      prisma.resource.aggregate({
        where: { userId: id },
        _sum: {
          ratingsCount: true,
        },
      }),
      // Note moyenne
      prisma.resource.aggregate({
        where: { userId: id },
        _avg: {
          averageRating: true,
        },
      }),
      // Ressources sauvegardées
      prisma.savedResource.count({
        where: { userId: id },
      }),
    ]);

    const stats = {
      resources: {
        total: totalResources,
        public: publicResources,
        private: totalResources - publicResources,
      },
      views: totalViews._sum.viewsCount || 0,
      downloads: totalDownloads._sum.downloadsCount || 0,
      ratings: {
        total: totalRatings._sum.ratingsCount || 0,
        average: averageRating._avg.averageRating || 0,
      },
      savedCount,
    };

    // Mettre en cache (15 minutes)
    await cacheService.set(cacheKey, stats, { ttl: 900 });

    res.json(stats);
  })
);

/**
 * PUT /api/profiles/:id
 * Mettre à jour son propre profil
 */
router.put(
  '/:id',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const data = updateProfileSchema.parse(req.body);

    // Vérifier que l'utilisateur met à jour son propre profil
    if (req.user.userId !== id && req.user.role !== 'admin') {
      throw new AppError('Vous ne pouvez mettre à jour que votre propre profil', 403, 'NOT_OWNER');
    }

    // Vérifier si le username est déjà pris (si fourni et différent)
    if (data.username) {
      const existing = await prisma.profile.findUnique({
        where: { username: data.username },
      });

      if (existing && existing.userId !== id) {
        throw new AppError('Ce nom d\'utilisateur est déjà pris', 409, 'USERNAME_TAKEN');
      }
    }

    const profile = await prisma.profile.update({
      where: { userId: id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        userRole: {
          select: {
            role: true,
          },
        },
      },
    });

    // Invalider le cache
    await cacheService.delete(`profile:${id}`);
    await cacheService.delete(`profile:${id}:stats`);

    res.json({
      id: profile.id,
      userId: profile.userId,
      email: profile.email,
      username: profile.username,
      fullName: profile.fullName,
      bio: profile.bio,
      avatarUrl: profile.avatarUrl,
      githubUsername: profile.githubUsername,
      preferredLayout: profile.preferredLayout,
      role: profile.userRole?.role,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    });
  })
);

/**
 * GET /api/profiles/:id/collections
 * Récupérer les collections d'un utilisateur
 */
router.get(
  '/:id/collections',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const includePrivate = req.user?.userId === id;

    const where: any = {
      userId: id,
    };

    // Si ce n'est pas le propriétaire, seulement publiques
    if (!includePrivate) {
      where.isPublic = true;
    }

    const collections = await prisma.collection.findMany({
      where,
      include: {
        collectionResources: {
          include: {
            resource: {
              select: {
                id: true,
                title: true,
                description: true,
                category: true,
                tags: true,
                resourceType: true,
                visibility: true,
                fileUrl: true,
                externalUrl: true,
                githubUrl: true,
                viewsCount: true,
                downloadsCount: true,
                averageRating: true,
              },
            },
          },
          take: 10, // Limiter les ressources affichées
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json(collections);
  })
);

export default router;


