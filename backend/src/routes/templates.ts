/**
 * Routes pour les templates de ressources
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { cacheService } from '../services/cacheService.js';

const router = express.Router();

// Schémas de validation
const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  isPublic: z.boolean().optional().default(false),
  templateData: z.record(z.any()),
  tags: z.array(z.string()).optional().default([]),
});

const updateTemplateSchema = createTemplateSchema.partial();

/**
 * @swagger
 * /api/templates:
 *   get:
 *     summary: Liste des templates publics
 *     tags: [Templates]
 *     responses:
 *       200:
 *         description: Liste des templates
 */
router.get(
  '/',
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { isPublic } = req.query;

    const where: any = {};
    if (isPublic === 'true' || !req.user) {
      where.isPublic = true;
    } else if (req.user) {
      // Les utilisateurs authentifiés peuvent voir leurs propres templates + publics
      where.OR = [
        { isPublic: true },
        { createdBy: req.user.userId },
      ];
    }

    const templates = await prisma.resourceTemplate.findMany({
      where,
      include: {
        creator: {
          select: {
            userId: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [
        { usageCount: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    res.json(templates);
  })
);

/**
 * @swagger
 * /api/templates/:id:
 *   get:
 *     summary: Détails d'un template
 *     tags: [Templates]
 *     responses:
 *       200:
 *         description: Détails du template
 *       404:
 *         description: Template non trouvé
 */
router.get(
  '/:id',
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const template = await prisma.resourceTemplate.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            userId: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!template) {
      throw new AppError('Template non trouvé', 404, 'TEMPLATE_NOT_FOUND');
    }

    // Vérifier la visibilité
    if (!template.isPublic && (!req.user || template.createdBy !== req.user?.userId)) {
      throw new AppError('Accès refusé à ce template', 403, 'ACCESS_DENIED');
    }

    res.json(template);
  })
);

/**
 * @swagger
 * /api/templates:
 *   post:
 *     summary: Créer un template
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Template créé
 */
router.post(
  '/',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const data = createTemplateSchema.parse(req.body);

    const templateData = data.templateData as any;
    const template = await prisma.resourceTemplate.create({
      data: {
        name: data.name,
        description: data.description || null,
        category: templateData?.category || '',
        isPublic: data.isPublic,
        templateData: templateData,
        tags: data.tags || [],
        language: templateData?.language || null,
        readme: templateData?.readme || null,
        creator: {
          connect: {
            userId: req.user.userId,
          },
        },
      },
      include: {
        creator: {
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
    await cacheService.invalidatePattern('templates:*');

    res.status(201).json(template);
  })
);

/**
 * @swagger
 * /api/templates/:id:
 *   put:
 *     summary: Mettre à jour un template
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Template mis à jour
 *       403:
 *         description: Non autorisé
 *       404:
 *         description: Template non trouvé
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
    const data = updateTemplateSchema.parse(req.body);

    // Vérifier que le template existe et appartient à l'utilisateur
    const existing = await prisma.resourceTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Template non trouvé', 404, 'TEMPLATE_NOT_FOUND');
    }

    if (existing.createdBy !== req.user.userId) {
      throw new AppError('Seul le créateur peut modifier ce template', 403, 'FORBIDDEN');
    }

    const template = await prisma.resourceTemplate.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        ...(data.templateData && { templateData: data.templateData as any }),
        ...(data.tags && { tags: data.tags }),
      },
      include: {
        creator: {
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
    await cacheService.invalidatePattern('templates:*');
    await cacheService.delete(`template:${id}`);

    res.json(template);
  })
);

/**
 * @swagger
 * /api/templates/:id:
 *   delete:
 *     summary: Supprimer un template
 *     tags: [Templates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Template supprimé
 *       403:
 *         description: Non autorisé
 *       404:
 *         description: Template non trouvé
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

    // Vérifier que le template existe et appartient à l'utilisateur
    const existing = await prisma.resourceTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Template non trouvé', 404, 'TEMPLATE_NOT_FOUND');
    }

    if (existing.createdBy !== req.user.userId && req.user.role !== 'admin') {
      throw new AppError('Seul le créateur ou un admin peut supprimer ce template', 403, 'FORBIDDEN');
    }

    await prisma.resourceTemplate.delete({
      where: { id },
    });

    // Invalider le cache
    await cacheService.invalidatePattern('templates:*');
    await cacheService.delete(`template:${id}`);

    res.json({ message: 'Template supprimé avec succès' });
  })
);

export default router;

