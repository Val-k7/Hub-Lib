/**
 * Routes pour les ressources
 */

import express from 'express';
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authMiddleware, optionalAuthMiddleware, requireOwnership, requireRole } from '../middleware/auth.js';
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
  asyncHandler(async (req: Request, res: Response) => {
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
      // Récupérer les groupes dont l'utilisateur est membre
      const userGroups = await prisma.groupMember.findMany({
        where: { userId: req.user.userId },
        select: { groupId: true },
      });
      const groupIds = userGroups.map(gm => gm.groupId);

      // L'utilisateur peut voir ses propres ressources + publiques + partagées avec lui
      where.OR = [
        { visibility: 'public' },
        { userId: req.user.userId },
        // Ressources partagées directement avec l'utilisateur
        {
          resourceShares: {
            some: {
              sharedWithUserId: req.user.userId,
              // Vérifier que le partage n'a pas expiré
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ],
            },
          },
        },
        // Ressources partagées avec les groupes dont l'utilisateur est membre
        ...(groupIds.length > 0 ? [{
          resourceShares: {
            some: {
              sharedWithGroupId: { in: groupIds },
              // Vérifier que le partage n'a pas expiré
              OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } },
              ],
            },
          },
        }] : []),
      ];
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
  asyncHandler(async (req: Request, res: Response) => {
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
 * Restreint aux admins uniquement
 */
router.post(
  '/',
  authMiddleware,
  requireRole('admin'),
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
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
  asyncHandler(async (req: Request, res: Response) => {
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
  asyncHandler(async (req: Request, res: Response) => {
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
  asyncHandler(async (req: Request, res: Response) => {
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
  asyncHandler(async (req: Request, res: Response) => {
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
  asyncHandler(async (req: Request, res: Response) => {
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

/**
 * POST /api/resources/:id/share
 * Partager une ressource avec un utilisateur ou un groupe
 */
const shareResourceSchema = z.object({
  sharedWithUserId: z.string().uuid().optional(),
  sharedWithGroupId: z.string().uuid().optional(),
  permission: z.enum(['read', 'write']).optional().default('read'),
  expiresAt: z.string().datetime().optional().nullable(),
});

const updateShareSchema = z.object({
  permission: z.enum(['read', 'write']).optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

const resourcePermissionSchema = z.object({
  userId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  permission: z.string().min(3).max(100),
  expiresAt: z.string().datetime().optional().nullable(),
});

router.post(
  '/:id/share',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const data = shareResourceSchema.parse(req.body);

    // Vérifier que la ressource existe et appartient à l'utilisateur
    const resource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new AppError('Ressource non trouvée', 404, 'RESOURCE_NOT_FOUND');
    }

    if (resource.userId !== req.user.userId) {
      throw new AppError('Seul le propriétaire peut partager cette ressource', 403, 'FORBIDDEN');
    }

    // Vérifier qu'un utilisateur ou un groupe est spécifié
    if (!data.sharedWithUserId && !data.sharedWithGroupId) {
      throw new AppError('Un utilisateur ou un groupe doit être spécifié', 400, 'INVALID_INPUT');
    }

    // Vérifier que l'utilisateur ou le groupe existe
    if (data.sharedWithUserId) {
      const user = await prisma.profile.findUnique({
        where: { userId: data.sharedWithUserId },
      });
      if (!user) {
        throw new AppError('Utilisateur non trouvé', 404, 'USER_NOT_FOUND');
      }
    }

    if (data.sharedWithGroupId) {
      const group = await prisma.group.findUnique({
        where: { id: data.sharedWithGroupId },
      });
      if (!group) {
        throw new AppError('Groupe non trouvé', 404, 'GROUP_NOT_FOUND');
      }
    }

    // Créer le partage
    const share = await prisma.resourceShare.create({
      data: {
        resourceId: id,
        sharedWithUserId: data.sharedWithUserId || null,
        sharedWithGroupId: data.sharedWithGroupId || null,
        permission: data.permission,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
      include: {
        sharedWithUser: {
          select: {
            userId: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        sharedWithGroup: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    // Invalider le cache
    await cacheService.delete(`resource:${id}`);

    res.status(201).json(share);
  })
);

/**
 * GET /api/resources/:id/shares
 * Liste des partages d'une ressource
 */
router.get(
  '/:id/shares',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;

    // Vérifier que la ressource existe et appartient à l'utilisateur
    const resource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new AppError('Ressource non trouvée', 404, 'RESOURCE_NOT_FOUND');
    }

    if (resource.userId !== req.user.userId) {
      throw new AppError('Seul le propriétaire peut voir les partages', 403, 'FORBIDDEN');
    }

    const shares = await prisma.resourceShare.findMany({
      where: { resourceId: id },
      include: {
        sharedWithUser: {
          select: {
            userId: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        sharedWithGroup: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(shares);
  })
);

/**
 * PUT /api/resources/:id/shares/:shareId
 * Met à jour un partage existant
 */
router.put(
  '/:id/shares/:shareId',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id, shareId } = req.params;
    const data = updateShareSchema.parse(req.body);

    const resource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new AppError('Ressource non trouvée', 404, 'RESOURCE_NOT_FOUND');
    }

    if (resource.userId !== req.user.userId) {
      throw new AppError('Seul le propriétaire peut mettre à jour un partage', 403, 'FORBIDDEN');
    }

    const share = await prisma.resourceShare.findUnique({
      where: { id: shareId },
    });

    if (!share || share.resourceId !== id) {
      throw new AppError('Partage non trouvé', 404, 'SHARE_NOT_FOUND');
    }

    const updateData: {
      permission?: 'read' | 'write';
      expiresAt?: Date | null;
    } = {};

    if (data.permission) {
      updateData.permission = data.permission;
    }

    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    }

    const updatedShare = await prisma.resourceShare.update({
      where: { id: shareId },
      data: updateData,
      include: {
        sharedWithUser: {
          select: {
            userId: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        sharedWithGroup: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    await cacheService.delete(`resource:${id}`);

    res.json(updatedShare);
  })
);

/**
 * DELETE /api/resources/:id/shares/:shareId
 * Retirer un partage
 */
router.delete(
  '/:id/shares/:shareId',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id, shareId } = req.params;

    // Vérifier que la ressource existe et appartient à l'utilisateur
    const resource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new AppError('Ressource non trouvée', 404, 'RESOURCE_NOT_FOUND');
    }

    if (resource.userId !== req.user.userId) {
      throw new AppError('Seul le propriétaire peut retirer un partage', 403, 'FORBIDDEN');
    }

    // Vérifier que le partage existe
    const share = await prisma.resourceShare.findUnique({
      where: { id: shareId },
    });

    if (!share || share.resourceId !== id) {
      throw new AppError('Partage non trouvé', 404, 'SHARE_NOT_FOUND');
    }

    // Supprimer le partage
    await prisma.resourceShare.delete({
      where: { id: shareId },
    });

    // Invalider le cache
    await cacheService.delete(`resource:${id}`);

    res.json({ message: 'Partage retiré avec succès' });
  })
);

/**
 * GET /api/resources/:id/permissions
 * Liste les permissions explicites d'une ressource
 */
router.get(
  '/:id/permissions',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const resource = await prisma.resource.findUnique({ where: { id } });

    if (!resource) {
      throw new AppError('Ressource non trouvée', 404, 'RESOURCE_NOT_FOUND');
    }

    if (resource.userId !== req.user.userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      throw new AppError('Accès refusé', 403, 'FORBIDDEN');
    }

    const permissions = await prisma.resourcePermission.findMany({
      where: { resourceId: id },
      include: {
        user: {
          select: {
            userId: true,
            username: true,
            fullName: true,
            email: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(permissions);
  })
);

/**
 * POST /api/resources/:id/permissions
 * Crée une permission explicite sur la ressource
 */
router.post(
  '/:id/permissions',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const data = resourcePermissionSchema.parse(req.body);

    if (!data.userId && !data.groupId) {
      throw new AppError('Un utilisateur ou un groupe doit être spécifié', 400, 'INVALID_INPUT');
    }

    const resource = await prisma.resource.findUnique({ where: { id } });
    if (!resource) {
      throw new AppError('Ressource non trouvée', 404, 'RESOURCE_NOT_FOUND');
    }

    if (resource.userId !== req.user.userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      throw new AppError('Seul le propriétaire ou un administrateur peut définir des permissions', 403, 'FORBIDDEN');
    }

    if (data.userId) {
      const user = await prisma.profile.findUnique({ where: { userId: data.userId } });
      if (!user) {
        throw new AppError('Utilisateur non trouvé', 404, 'USER_NOT_FOUND');
      }
    }

    if (data.groupId) {
      const group = await prisma.group.findUnique({ where: { id: data.groupId } });
      if (!group) {
        throw new AppError('Groupe non trouvé', 404, 'GROUP_NOT_FOUND');
      }
    }

    const permission = await prisma.resourcePermission.create({
      data: {
        resourceId: id,
        userId: data.userId || null,
        groupId: data.groupId || null,
        permission: data.permission,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    res.status(201).json(permission);
  })
);

/**
 * DELETE /api/resources/:id/permissions/:permissionId
 * Supprime une permission explicite
 */
router.delete(
  '/:id/permissions/:permissionId',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id, permissionId } = req.params;
    const resource = await prisma.resource.findUnique({ where: { id } });

    if (!resource) {
      throw new AppError('Ressource non trouvée', 404, 'RESOURCE_NOT_FOUND');
    }

    if (resource.userId !== req.user.userId && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      throw new AppError('Seul le propriétaire ou un administrateur peut modifier les permissions', 403, 'FORBIDDEN');
    }

    const resourcePermission = await prisma.resourcePermission.findUnique({
      where: { id: permissionId },
    });

    if (!resourcePermission || resourcePermission.resourceId !== id) {
      throw new AppError('Permission non trouvée', 404, 'RESOURCE_PERMISSION_NOT_FOUND');
    }

    await prisma.resourcePermission.delete({ where: { id: permissionId } });

    res.json({ message: 'Permission supprimée avec succès' });
  })
);

/**
 * POST /api/resources/:id/save
 * Sauvegarder une ressource (favoris)
 */
router.post(
  '/:id/save',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;

    // Vérifier que la ressource existe
    const resource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new AppError('Ressource non trouvée', 404, 'RESOURCE_NOT_FOUND');
    }

    // Vérifier si déjà sauvegardée
    const existing = await prisma.savedResource.findUnique({
      where: {
        userId_resourceId: {
          userId: req.user.userId,
          resourceId: id,
        },
      },
    });

    if (existing) {
      throw new AppError('Ressource déjà sauvegardée', 400, 'ALREADY_SAVED');
    }

    // Créer la sauvegarde
    const saved = await prisma.savedResource.create({
      data: {
        userId: req.user.userId,
        resourceId: id,
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

    res.status(201).json(saved);
  })
);

/**
 * DELETE /api/resources/:id/save
 * Retirer une ressource des favoris
 */
router.delete(
  '/:id/save',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;

    // Vérifier que la sauvegarde existe
    const saved = await prisma.savedResource.findUnique({
      where: {
        userId_resourceId: {
          userId: req.user.userId,
          resourceId: id,
        },
      },
    });

    if (!saved) {
      throw new AppError('Ressource non sauvegardée', 404, 'NOT_SAVED');
    }

    // Supprimer la sauvegarde
    await prisma.savedResource.delete({
      where: {
        userId_resourceId: {
          userId: req.user.userId,
          resourceId: id,
        },
      },
    });

    res.json({ message: 'Ressource retirée des favoris' });
  })
);

/**
 * GET /api/resources/saved
 * Liste des ressources sauvegardées par l'utilisateur
 */
router.get(
  '/saved',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const filters = resourceFiltersSchema.parse(req.query);
    const skip = (filters.page - 1) * filters.limit;

    const where: any = {
      userId: req.user.userId,
    };

    const savedResources = await prisma.savedResource.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
      skip,
      take: filters.limit,
    });

    const total = await prisma.savedResource.count({ where });

    res.json({
      data: savedResources.map((sr) => sr.resource),
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    });
  })
);

/**
 * POST /api/resources/:id/rating
 * Noter une ressource
 */
const ratingSchema = z.object({
  rating: z.number().int().min(1).max(5),
});

router.post(
  '/:id/rating',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const { rating } = ratingSchema.parse(req.body);

    // Vérifier que la ressource existe
    const resource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new AppError('Ressource non trouvée', 404, 'RESOURCE_NOT_FOUND');
    }

    // Vérifier si l'utilisateur a déjà noté
    const existing = await prisma.resourceRating.findUnique({
      where: {
        userId_resourceId: {
          userId: req.user.userId,
          resourceId: id,
        },
      },
    });

    if (existing) {
      throw new AppError('Ressource déjà notée. Utilisez PUT pour modifier.', 400, 'ALREADY_RATED');
    }

    // Créer la note
    const resourceRating = await prisma.resourceRating.create({
      data: {
        userId: req.user.userId,
        resourceId: id,
        rating,
      },
    });

    // Recalculer la moyenne et le nombre de notes
    const ratings = await prisma.resourceRating.findMany({
      where: { resourceId: id },
    });

    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
    const ratingsCount = ratings.length;

    await prisma.resource.update({
      where: { id },
      data: {
        averageRating: averageRating,
        ratingsCount,
      },
    });

    // Invalider le cache
    await cacheService.delete(`resource:${id}`);

    res.status(201).json(resourceRating);
  })
);

/**
 * PUT /api/resources/:id/rating
 * Modifier sa note
 */
router.put(
  '/:id/rating',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const { rating } = ratingSchema.parse(req.body);

    // Vérifier que la note existe
    const existing = await prisma.resourceRating.findUnique({
      where: {
        userId_resourceId: {
          userId: req.user.userId,
          resourceId: id,
        },
      },
    });

    if (!existing) {
      throw new AppError('Note non trouvée. Utilisez POST pour créer.', 404, 'RATING_NOT_FOUND');
    }

    // Mettre à jour la note
    const resourceRating = await prisma.resourceRating.update({
      where: {
        userId_resourceId: {
          userId: req.user.userId,
          resourceId: id,
        },
      },
      data: { rating },
    });

    // Recalculer la moyenne
    const ratings = await prisma.resourceRating.findMany({
      where: { resourceId: id },
    });

    const averageRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

    await prisma.resource.update({
      where: { id },
      data: {
        averageRating: averageRating,
      },
    });

    // Invalider le cache
    await cacheService.delete(`resource:${id}`);

    res.json(resourceRating);
  })
);

/**
 * DELETE /api/resources/:id/rating
 * Supprimer sa note
 */
router.delete(
  '/:id/rating',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;

    // Vérifier que la note existe
    const existing = await prisma.resourceRating.findUnique({
      where: {
        userId_resourceId: {
          userId: req.user.userId,
          resourceId: id,
        },
      },
    });

    if (!existing) {
      throw new AppError('Note non trouvée', 404, 'RATING_NOT_FOUND');
    }

    // Supprimer la note
    await prisma.resourceRating.delete({
      where: {
        userId_resourceId: {
          userId: req.user.userId,
          resourceId: id,
        },
      },
    });

    // Recalculer la moyenne
    const ratings = await prisma.resourceRating.findMany({
      where: { resourceId: id },
    });

    const averageRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;
    const ratingsCount = ratings.length;

    await prisma.resource.update({
      where: { id },
      data: {
        averageRating: averageRating,
        ratingsCount,
      },
    });

    // Invalider le cache
    await cacheService.delete(`resource:${id}`);

    res.json({ message: 'Note supprimée avec succès' });
  })
);

/**
 * GET /api/resources/:id/ratings
 * Liste des notes d'une ressource
 */
router.get(
  '/:id/ratings',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Vérifier que la ressource existe
    const resource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      throw new AppError('Ressource non trouvée', 404, 'RESOURCE_NOT_FOUND');
    }

    const ratings = await prisma.resourceRating.findMany({
      where: { resourceId: id },
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
      orderBy: { createdAt: 'desc' },
    });

    res.json(ratings);
  })
);

// Importer et utiliser les routes de versions
import versionRoutes from './versions.js';
router.use('/', versionRoutes);

export default router;



