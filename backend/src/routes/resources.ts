/**
 * Routes pour les ressources
 */

import express from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authMiddleware, optionalAuthMiddleware, requireOwnership } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { cacheService } from '../services/cacheService.js';

const router = express.Router();

// Schémas de validation
const createResourceSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().min(1),
  category: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  resourceType: z.enum(['file_upload', 'external_link', 'github_repo']).optional().default('external_link'),
  visibility: z.enum(['public', 'private', 'shared_users', 'shared_groups']).optional().default('public'),
  githubUrl: z.string().url().optional().nullable(),
  externalUrl: z.string().url().optional().nullable(),
  filePath: z.string().optional().nullable(),
  fileUrl: z.string().url().optional().nullable(),
  fileSize: z.string().optional().nullable(),
  language: z.string().optional().nullable(),
  license: z.string().optional().nullable(),
  readme: z.string().optional().nullable(),
});

const updateResourceSchema = createResourceSchema.partial();

const resourceFiltersSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().array().optional(),
  authorId: z.string().uuid().optional(),
  language: z.string().optional(),
  visibility: z.enum(['public', 'private', 'shared_users', 'shared_groups']).optional(),
  resourceType: z.enum(['file_upload', 'external_link', 'github_repo']).optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional().default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional().default('20'),
  sortBy: z.enum(['created_at', 'updated_at', 'views_count', 'downloads_count', 'average_rating']).optional().default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * GET /api/resources
 * Liste des ressources avec filtres et pagination
 */
router.get(
  '/',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    const filters = resourceFiltersSchema.parse({
      ...req.query,
      tags: req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]) : undefined,
    });

    const skip = (filters.page - 1) * filters.limit;

    // Construire les filtres Prisma
    const where: any = {};

    // Visibilité : si l'utilisateur n'est pas authentifié, seulement public
    if (!req.user) {
      where.visibility = 'public';
    } else {
      // L'utilisateur peut voir ses propres ressources + publiques + partagées avec lui
      where.OR = [
        { visibility: 'public' },
        { userId: req.user.userId },
      ];

      // TODO: Ajouter les ressources partagées avec l'utilisateur
      // where.OR.push({ resourceShares: { sharedWithUserId: req.user.userId } });
    }

    // Recherche full-text
    if (filters.search) {
      where.OR = [
        ...(where.OR || []),
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { readme: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Filtres spécifiques
    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = { hasEvery: filters.tags };
    }

    if (filters.authorId) {
      where.userId = filters.authorId;
    }

    if (filters.language) {
      where.language = filters.language;
    }

    if (filters.visibility) {
      where.visibility = filters.visibility;
    }

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    // Cache key
    const cacheKey = `resources:list:${JSON.stringify(where)}:${filters.page}:${filters.limit}:${filters.sortBy}:${filters.sortOrder}`;

    // Essayer de récupérer depuis le cache (seulement pour les ressources publiques non authentifiées)
    if (!req.user && !filters.search) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
    }

    // Récupérer les ressources
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
          [filters.sortBy]: filters.sortOrder,
        },
        skip,
        take: filters.limit,
      }),
      prisma.resource.count({ where }),
    ]);

    const result = {
      data: resources,
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    };

    // Mettre en cache si public et non authentifié
    if (!req.user && !filters.search) {
      await cacheService.set(cacheKey, result, { ttl: 300 }); // 5 minutes
    }

    res.json(result);
  })
);

/**
 * GET /api/resources/:id
 * Détails d'une ressource
 */
router.get(
  '/:id',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        profile: {
          select: {
            userId: true,
            username: true,
            fullName: true,
            avatarUrl: true,
            bio: true,
          },
        },
      },
    });

    if (!resource) {
      throw new AppError('Ressource non trouvée', 404, 'RESOURCE_NOT_FOUND');
    }

    // Vérifier la visibilité
    if (resource.visibility !== 'public' && (!req.user || resource.userId !== req.user.userId)) {
      throw new AppError('Accès refusé à cette ressource', 403, 'ACCESS_DENIED');
    }

    // Récupérer depuis le cache si possible
    const cacheKey = `resource:${id}`;
    const cached = await cacheService.get(cacheKey);
    if (cached && resource.visibility === 'public') {
      return res.json(cached);
    }

    // Mettre en cache si public
    if (resource.visibility === 'public') {
      await cacheService.set(cacheKey, resource, { ttl: 600 }); // 10 minutes
    }

    res.json(resource);
  })
);

/**
 * POST /api/resources
 * Créer une nouvelle ressource
 */
router.post(
  '/',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const data = createResourceSchema.parse(req.body);

    const resource = await prisma.resource.create({
      data: {
        userId: req.user.userId,
        title: data.title,
        description: data.description,
        category: data.category || null,
        tags: data.tags || [],
        resourceType: data.resourceType,
        visibility: data.visibility,
        githubUrl: data.githubUrl,
        externalUrl: data.externalUrl,
        filePath: data.filePath,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        language: data.language,
        license: data.license,
        readme: data.readme,
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

    // Invalider le cache
    await cacheService.invalidatePattern('resources:list:*');

    res.status(201).json(resource);
  })
);

/**
 * PUT /api/resources/:id
 * Mettre à jour une ressource
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
    const data = updateResourceSchema.parse(req.body);

    // Vérifier que la ressource existe et que l'utilisateur est propriétaire
    const existing = await prisma.resource.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Ressource non trouvée', 404, 'RESOURCE_NOT_FOUND');
    }

    if (existing.userId !== req.user.userId && req.user.role !== 'admin') {
      throw new AppError('Vous n\'êtes pas propriétaire de cette ressource', 403, 'NOT_OWNER');
    }

    const resource = await prisma.resource.update({
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

    // Invalider le cache
    await cacheService.delete(`resource:${id}`);
    await cacheService.invalidatePattern('resources:list:*');

    res.json(resource);
  })
);

/**
 * DELETE /api/resources/:id
 * Supprimer une ressource
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

    // Vérifier que la ressource existe et que l'utilisateur est propriétaire
    const existing = await prisma.resource.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Ressource non trouvée', 404, 'RESOURCE_NOT_FOUND');
    }

    if (existing.userId !== req.user.userId && req.user.role !== 'admin') {
      throw new AppError('Vous n\'êtes pas propriétaire de cette ressource', 403, 'NOT_OWNER');
    }

    // Supprimer en cascade (les relations sont définies dans Prisma)
    await prisma.resource.delete({
      where: { id },
    });

    // Invalider le cache
    await cacheService.delete(`resource:${id}`);
    await cacheService.invalidatePattern('resources:list:*');

    res.status(204).send();
  })
);

/**
 * POST /api/resources/:id/view
 * Incrémenter les vues d'une ressource
 */
router.post(
  '/:id/view',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Utiliser la fonction PostgreSQL pour incrémenter
    await prisma.$executeRawUnsafe(
      'SELECT increment_resource_views($1)',
      id
    );

    // Invalider le cache
    await cacheService.delete(`resource:${id}`);

    res.json({ message: 'Vue incrémentée' });
  })
);

/**
 * POST /api/resources/:id/download
 * Incrémenter les téléchargements d'une ressource
 */
router.post(
  '/:id/download',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Utiliser la fonction PostgreSQL pour incrémenter
    await prisma.$executeRawUnsafe(
      'SELECT increment_resource_downloads($1)',
      id
    );

    // Invalider le cache
    await cacheService.delete(`resource:${id}`);

    res.json({ message: 'Téléchargement incrémenté' });
  })
);

/**
 * POST /api/resources/:id/fork
 * Fork (dupliquer) une ressource
 */
router.post(
  '/:id/fork',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;

    // Récupérer la ressource originale
    const original = await prisma.resource.findUnique({
      where: { id },
    });

    if (!original) {
      throw new AppError('Ressource non trouvée', 404, 'RESOURCE_NOT_FOUND');
    }

    // Vérifier la visibilité
    if (original.visibility !== 'public' && original.userId !== req.user.userId) {
      throw new AppError('Accès refusé à cette ressource', 403, 'ACCESS_DENIED');
    }

    // Créer une copie
    const forked = await prisma.resource.create({
      data: {
        userId: req.user.userId,
        title: `${original.title} (Fork)`,
        description: original.description,
        category: original.category,
        tags: original.tags,
        resourceType: original.resourceType,
        visibility: 'private', // Le fork est privé par défaut
        githubUrl: original.githubUrl,
        externalUrl: original.externalUrl,
        filePath: original.filePath,
        fileUrl: original.fileUrl,
        fileSize: original.fileSize,
        language: original.language,
        license: original.license,
        readme: original.readme,
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

    // Invalider le cache
    await cacheService.invalidatePattern('resources:list:*');

    res.status(201).json(forked);
  })
);

export default router;


