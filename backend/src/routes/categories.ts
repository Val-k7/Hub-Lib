/**
 * Routes pour la hiérarchie de catégories
 */

import express from 'express';
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authMiddleware, optionalAuthMiddleware, requireRole } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { cacheService } from '../services/cacheService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Schémas de validation
const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().optional().nullable(),
  description: z.string().optional().nullable(),
  orderIndex: z.number().int().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const updateCategorySchema = createCategorySchema.partial();

/**
 * Fonction récursive pour construire la hiérarchie
 */
async function buildCategoryTree(
  categories: Array<{
    id: string;
    name: string;
    parentId: string | null;
    description: string | null;
    orderIndex: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>,
  parentId: string | null = null
): Promise<any[]> {
  return categories
    .filter((cat) => cat.parentId === parentId)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((cat) => ({
      id: cat.id,
      name: cat.name,
      parentId: cat.parentId,
      description: cat.description,
      orderIndex: cat.orderIndex,
      isActive: cat.isActive,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      children: buildCategoryTree(categories, cat.id),
    }));
}

/**
 * GET /api/categories
 * Liste toutes les catégories avec hiérarchie
 */
router.get(
  '/',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { includeInactive = 'false', tree = 'true' } = req.query;

    const cacheKey = `categories:${includeInactive}:${tree}`;

    // Essayer de récupérer depuis le cache
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const where: any = {};
    if (includeInactive !== 'true') {
      where.isActive = true;
    }

    const categories = await prisma.categoryHierarchy.findMany({
      where,
      orderBy: [
        { orderIndex: 'asc' },
        { name: 'asc' },
      ],
    });

    let result: any;

    if (tree === 'true') {
      // Construire la hiérarchie en arbre
      result = {
        tree: await buildCategoryTree(categories),
        flat: categories,
      };
    } else {
      // Retourner la liste plate
      result = {
        categories,
      };
    }

    // Mettre en cache (1 heure)
    await cacheService.set(cacheKey, result, { ttl: 3600 });

    res.json(result);
  })
);

/**
 * GET /api/categories/:id
 * Récupère les détails d'une catégorie
 */
router.get(
  '/:id',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const category = await prisma.categoryHierarchy.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        children: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            orderIndex: true,
            isActive: true,
          },
        },
        filters: {
          where: { isRequired: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!category) {
      throw new AppError('Catégorie non trouvée', 404);
    }

    res.json(category);
  })
);

/**
 * GET /api/categories/:id/children
 * Récupère les catégories enfants d'une catégorie
 */
router.get(
  '/:id/children',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { includeInactive = 'false' } = req.query;

    const where: any = {
      parentId: id,
    };

    if (includeInactive !== 'true') {
      where.isActive = true;
    }

    const children = await prisma.categoryHierarchy.findMany({
      where,
      orderBy: [
        { orderIndex: 'asc' },
        { name: 'asc' },
      ],
    });

    res.json({ children });
  })
);

/**
 * POST /api/categories
 * Crée une nouvelle catégorie
 */
router.post(
  '/',
  authMiddleware,
  requireRole('admin'),
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Non authentifié', 401);
    }

    const data = createCategorySchema.parse(req.body);

    // Vérifier que le parent existe si fourni
    if (data.parentId) {
      const parent = await prisma.categoryHierarchy.findUnique({
        where: { id: data.parentId },
      });

      if (!parent) {
        throw new AppError('Catégorie parente non trouvée', 404);
      }
    }

    // Créer la catégorie
    const category = await prisma.categoryHierarchy.create({
      data: {
        name: data.name,
        parentId: data.parentId || null,
        description: data.description || null,
        orderIndex: data.orderIndex || 0,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Invalider le cache des catégories
      await cacheService.invalidatePattern('categories:*');

    logger.info(`Nouvelle catégorie créée: ${category.id}`, {
      name: category.name,
      parentId: category.parentId,
      userId: req.user.userId,
    });

    res.status(201).json(category);
  })
);

/**
 * PUT /api/categories/:id
 * Met à jour une catégorie
 */
router.put(
  '/:id',
  authMiddleware,
  requireRole('admin'),
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Non authentifié', 401);
    }

    const { id } = req.params;
    const data = updateCategorySchema.parse(req.body);

    // Vérifier que la catégorie existe
    const existing = await prisma.categoryHierarchy.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Catégorie non trouvée', 404);
    }

    // Vérifier que le parent existe si fourni et qu'il n'est pas la catégorie elle-même
    if (data.parentId) {
      if (data.parentId === id) {
        throw new AppError('Une catégorie ne peut pas être son propre parent', 400);
      }

      const parent = await prisma.categoryHierarchy.findUnique({
        where: { id: data.parentId },
      });

      if (!parent) {
        throw new AppError('Catégorie parente non trouvée', 404);
      }

      // Vérifier qu'on ne crée pas de boucle dans la hiérarchie
      let currentParentId = parent.parentId;
      while (currentParentId) {
        if (currentParentId === id) {
          throw new AppError('Impossible de créer une boucle dans la hiérarchie', 400);
        }
        const currentParent = await prisma.categoryHierarchy.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        });
        currentParentId = currentParent?.parentId || null;
      }
    }

    // Mettre à jour la catégorie
    const category = await prisma.categoryHierarchy.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.parentId !== undefined && { parentId: data.parentId || null }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          where: { isActive: true },
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Invalider le cache des catégories
      await cacheService.invalidatePattern('categories:*');

    logger.info(`Catégorie mise à jour: ${id}`, {
      userId: req.user.userId,
    });

    res.json(category);
  })
);

/**
 * DELETE /api/categories/:id
 * Supprime une catégorie
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole('admin'),
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Non authentifié', 401);
    }

    const { id } = req.params;

    // Vérifier que la catégorie existe
    const category = await prisma.categoryHierarchy.findUnique({
      where: { id },
      include: {
        children: {
          select: { id: true },
        },
      },
    });

    if (!category) {
      throw new AppError('Catégorie non trouvée', 404);
    }

    // Vérifier qu'il n'y a pas d'enfants
    if (category.children.length > 0) {
      throw new AppError('Impossible de supprimer une catégorie qui a des enfants. Supprimez d\'abord les catégories enfants.', 400);
    }

    // Supprimer la catégorie
    await prisma.categoryHierarchy.delete({
      where: { id },
    });

    // Invalider le cache des catégories
      await cacheService.invalidatePattern('categories:*');

    logger.info(`Catégorie supprimée: ${id}`, {
      name: category.name,
      userId: req.user.userId,
    });

    res.json({
      message: 'Catégorie supprimée avec succès',
    });
  })
);

// =============================================================================
// ROUTES POUR LES FILTRES DE CATÉGORIES
// =============================================================================

// Schémas de validation pour les filtres
const createFilterSchema = z.object({
  filterKey: z.string().min(1).max(255),
  filterType: z.enum(['text', 'select', 'multiselect', 'range', 'date']),
  filterLabel: z.string().min(1).max(255),
  filterOptions: z.array(z.string()).optional().default([]),
  isRequired: z.boolean().optional().default(false),
  orderIndex: z.number().int().min(0).optional().default(0),
});

const updateFilterSchema = createFilterSchema.partial();

/**
 * GET /api/categories/:categoryId/filters
 * Liste tous les filtres d'une catégorie
 */
router.get(
  '/:categoryId/filters',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { categoryId } = req.params;

    // Vérifier que la catégorie existe
    const category = await prisma.categoryHierarchy.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      throw new AppError('Catégorie non trouvée', 404);
    }

    const filters = await prisma.categoryFilter.findMany({
      where: { categoryId },
      orderBy: [
        { orderIndex: 'asc' },
        { filterLabel: 'asc' },
      ],
    });

    res.json({ filters });
  })
);

/**
 * POST /api/categories/:categoryId/filters
 * Crée un nouveau filtre pour une catégorie
 */
router.post(
  '/:categoryId/filters',
  authMiddleware,
  requireRole('admin'),
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Non authentifié', 401);
    }

    const { categoryId } = req.params;
    const data = createFilterSchema.parse(req.body);

    // Vérifier que la catégorie existe
    const category = await prisma.categoryHierarchy.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true },
    });

    if (!category) {
      throw new AppError('Catégorie non trouvée', 404);
    }

    // Créer le filtre
    const filter = await prisma.categoryFilter.create({
      data: {
        categoryId,
        filterKey: data.filterKey,
        filterType: data.filterType,
        filterLabel: data.filterLabel,
        filterOptions: data.filterOptions || [],
        isRequired: data.isRequired || false,
        orderIndex: data.orderIndex || 0,
      },
    });

    // Invalider le cache des catégories
      await cacheService.invalidatePattern('categories:*');

    logger.info(`Nouveau filtre créé: ${filter.id} pour catégorie ${categoryId}`, {
      filterKey: data.filterKey,
      userId: req.user.userId,
    });

    res.status(201).json(filter);
  })
);

/**
 * PUT /api/filters/:id
 * Met à jour un filtre
 */
router.put(
  '/filters/:id',
  authMiddleware,
  requireRole('admin'),
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Non authentifié', 401);
    }

    const { id } = req.params;
    const data = updateFilterSchema.parse(req.body);

    // Vérifier que le filtre existe
    const existing = await prisma.categoryFilter.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!existing) {
      throw new AppError('Filtre non trouvé', 404);
    }

    // Mettre à jour le filtre
    const filter = await prisma.categoryFilter.update({
      where: { id },
      data: {
        ...(data.filterKey !== undefined && { filterKey: data.filterKey }),
        ...(data.filterType !== undefined && { filterType: data.filterType }),
        ...(data.filterLabel !== undefined && { filterLabel: data.filterLabel }),
        ...(data.filterOptions !== undefined && { filterOptions: data.filterOptions }),
        ...(data.isRequired !== undefined && { isRequired: data.isRequired }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
      },
    });

    // Invalider le cache des catégories
      await cacheService.invalidatePattern('categories:*');

    logger.info(`Filtre mis à jour: ${id}`, {
      userId: req.user.userId,
    });

    res.json(filter);
  })
);

/**
 * DELETE /api/filters/:id
 * Supprime un filtre
 */
router.delete(
  '/filters/:id',
  authMiddleware,
  requireRole('admin'),
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Non authentifié', 401);
    }

    const { id } = req.params;

    // Vérifier que le filtre existe
    const filter = await prisma.categoryFilter.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!filter) {
      throw new AppError('Filtre non trouvé', 404);
    }

    // Supprimer le filtre
    await prisma.categoryFilter.delete({
      where: { id },
    });

    // Invalider le cache des catégories
      await cacheService.invalidatePattern('categories:*');

    logger.info(`Filtre supprimé: ${id}`, {
      filterKey: filter.filterKey,
      categoryId: filter.categoryId,
      userId: req.user.userId,
    });

    res.json({
      message: 'Filtre supprimé avec succès',
    });
  })
);

export default router;

