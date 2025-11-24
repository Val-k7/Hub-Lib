/**
 * Routes pour les collections de ressources
 */

import express from 'express';
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { cacheService } from '../services/cacheService.js';

const router = express.Router();

// Schémas de validation
const createCollectionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  isPublic: z.boolean().optional().default(false),
  coverImageUrl: z.string().url().optional().nullable(),
});

const updateCollectionSchema = createCollectionSchema.partial();

/**
 * GET /api/collections
 * Liste des collections
 */
router.get(
  '/',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.query.userId as string | undefined;
    const includePrivate = req.user?.userId === userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const page = parseInt(req.query.page as string) || 1;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (userId) {
      where.userId = userId;
      if (!includePrivate) {
        where.isPublic = true;
      }
    } else {
      // Si pas de userId, seulement collections publiques
      where.isPublic = true;
    }

    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
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
          _count: {
            select: {
              collectionResources: true,
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.collection.count({ where }),
    ]);

    res.json({
      data: collections.map((c) => ({
        ...c,
        resourcesCount: c._count.collectionResources,
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
 * GET /api/collections/:id
 * Détails d'une collection
 */
router.get(
  '/:id',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        profile: {
          select: {
            userId: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        collectionResources: {
          include: {
            resource: {
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
            },
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
      },
    });

    if (!collection) {
      throw new AppError('Collection non trouvée', 404, 'COLLECTION_NOT_FOUND');
    }

    // Vérifier la visibilité
    if (!collection.isPublic && collection.userId !== req.user?.userId) {
      throw new AppError('Accès refusé à cette collection', 403, 'ACCESS_DENIED');
    }

    res.json(collection);
  })
);

/**
 * POST /api/collections
 * Créer une nouvelle collection
 */
router.post(
  '/',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const data = createCollectionSchema.parse(req.body);

    const collection = await prisma.collection.create({
      data: {
        userId: req.user.userId,
        name: data.name,
        description: data.description,
        isPublic: data.isPublic,
        coverImageUrl: data.coverImageUrl,
        resourcesCount: 0,
      },
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
    });

    res.status(201).json(collection);
  })
);

/**
 * PUT /api/collections/:id
 * Mettre à jour une collection
 */
router.put(
  '/:id',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const data = updateCollectionSchema.parse(req.body);

    // Vérifier que la collection existe et que l'utilisateur est propriétaire
    const existing = await prisma.collection.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Collection non trouvée', 404, 'COLLECTION_NOT_FOUND');
    }

    if (existing.userId !== req.user.userId && req.user.role !== 'admin') {
      throw new AppError('Vous n\'êtes pas propriétaire de cette collection', 403, 'NOT_OWNER');
    }

    const collection = await prisma.collection.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
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
    });

    res.json(collection);
  })
);

/**
 * DELETE /api/collections/:id
 * Supprimer une collection
 */
router.delete(
  '/:id',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;

    // Vérifier que la collection existe et que l'utilisateur est propriétaire
    const existing = await prisma.collection.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Collection non trouvée', 404, 'COLLECTION_NOT_FOUND');
    }

    if (existing.userId !== req.user.userId && req.user.role !== 'admin') {
      throw new AppError('Vous n\'êtes pas propriétaire de cette collection', 403, 'NOT_OWNER');
    }

    await prisma.collection.delete({
      where: { id },
    });

    res.status(204).send();
  })
);

/**
 * POST /api/collections/:id/resources
 * Ajouter une ressource à une collection
 */
router.post(
  '/:id/resources',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id: collectionId } = req.params;
    const { resourceId } = req.body;

    if (!resourceId) {
      throw new AppError('resourceId requis', 400, 'RESOURCE_ID_REQUIRED');
    }

    // Vérifier que la collection existe et que l'utilisateur est propriétaire
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new AppError('Collection non trouvée', 404, 'COLLECTION_NOT_FOUND');
    }

    if (collection.userId !== req.user.userId && req.user.role !== 'admin') {
      throw new AppError('Vous n\'êtes pas propriétaire de cette collection', 403, 'NOT_OWNER');
    }

    // Vérifier que la ressource existe et est accessible
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new AppError('Ressource non trouvée', 404, 'RESOURCE_NOT_FOUND');
    }

    // Vérifier la visibilité de la ressource
    if (resource.visibility !== 'public' && resource.userId !== req.user.userId) {
      throw new AppError('Vous ne pouvez pas ajouter cette ressource', 403, 'ACCESS_DENIED');
    }

    // Vérifier si la ressource n'est pas déjà dans la collection
    const existing = await prisma.collectionResource.findUnique({
      where: {
        collectionId_resourceId: {
          collectionId: collectionId,
          resourceId: resourceId,
        },
      },
    });

    if (existing) {
      throw new AppError('Cette ressource est déjà dans la collection', 409, 'RESOURCE_ALREADY_IN_COLLECTION');
    }

    // Obtenir l'ordre maximum actuel
    const maxOrder = await prisma.collectionResource.findFirst({
      where: { collectionId: collectionId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    const collectionResource = await prisma.collectionResource.create({
      data: {
        collectionId: collectionId,
        resourceId: resourceId,
        orderIndex: (maxOrder?.orderIndex || 0) + 1,
      },
      include: {
        resource: {
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
        },
      },
    });

    // Le trigger PostgreSQL mettra à jour resources_count automatiquement
    // Mais on peut aussi le faire manuellement si nécessaire

    res.status(201).json(collectionResource);
  })
);

/**
 * DELETE /api/collections/:id/resources/:resourceId
 * Retirer une ressource d'une collection
 */
router.delete(
  '/:id/resources/:resourceId',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id: collectionId, resourceId } = req.params;

    // Vérifier que la collection existe et que l'utilisateur est propriétaire
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      throw new AppError('Collection non trouvée', 404, 'COLLECTION_NOT_FOUND');
    }

    if (collection.userId !== req.user.userId && req.user.role !== 'admin') {
      throw new AppError('Vous n\'êtes pas propriétaire de cette collection', 403, 'NOT_OWNER');
    }

    await prisma.collectionResource.deleteMany({
      where: {
        collectionId: collectionId,
        resourceId: resourceId,
      },
    });

    res.status(204).send();
  })
);

export default router;

