/**
 * Routes pour les commentaires sur les ressources
 */

import express from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// Schémas de validation
const createCommentSchema = z.object({
  resourceId: z.string().uuid(),
  content: z.string().min(1).max(2000),
  parentId: z.string().uuid().optional().nullable(),
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

/**
 * GET /api/comments/resource/:resourceId
 * Récupérer les commentaires d'une ressource
 */
router.get(
  '/resource/:resourceId',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    const { resourceId } = req.params;

    // Vérifier que la ressource existe et est accessible
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new AppError('Ressource non trouvée', 404, 'RESOURCE_NOT_FOUND');
    }

    // Vérifier la visibilité
    if (resource.visibility !== 'public' && (!req.user || resource.userId !== req.user.userId)) {
      throw new AppError('Accès refusé à cette ressource', 403, 'ACCESS_DENIED');
    }

    // Récupérer tous les commentaires
    const comments = await prisma.resourceComment.findMany({
      where: {
        resourceId: resourceId,
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
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Organiser les commentaires en arbre (commentaires et réponses)
    const commentMap = new Map();
    const rootComments: any[] = [];

    // Créer une map de tous les commentaires avec leurs réponses
    comments.forEach((comment) => {
      commentMap.set(comment.id, {
        ...comment,
        replies: [],
      });
    });

    // Organiser en arbre
    comments.forEach((comment) => {
      const commentWithReplies = commentMap.get(comment.id)!;
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    res.json({
      data: rootComments,
      total: comments.length,
    });
  })
);

/**
 * POST /api/comments
 * Créer un commentaire
 */
router.post(
  '/',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const data = createCommentSchema.parse(req.body);

    // Vérifier que la ressource existe et est accessible
    const resource = await prisma.resource.findUnique({
      where: { id: data.resourceId },
    });

    if (!resource) {
      throw new AppError('Ressource non trouvée', 404, 'RESOURCE_NOT_FOUND');
    }

    // Vérifier la visibilité
    if (resource.visibility !== 'public' && resource.userId !== req.user.userId) {
      throw new AppError('Vous ne pouvez pas commenter cette ressource', 403, 'ACCESS_DENIED');
    }

    // Si c'est une réponse, vérifier que le commentaire parent existe
    if (data.parentId) {
      const parent = await prisma.resourceComment.findUnique({
        where: { id: data.parentId },
      });

      if (!parent) {
        throw new AppError('Commentaire parent non trouvé', 404, 'PARENT_COMMENT_NOT_FOUND');
      }

      if (parent.resourceId !== data.resourceId) {
        throw new AppError('Le commentaire parent ne correspond pas à la ressource', 400, 'INVALID_PARENT');
      }
    }

    const comment = await prisma.resourceComment.create({
      data: {
        resourceId: data.resourceId,
        userId: req.user.userId,
        parentId: data.parentId || null,
        content: data.content.trim(),
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

    res.status(201).json(comment);
  })
);

/**
 * PUT /api/comments/:id
 * Mettre à jour un commentaire
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
    const data = updateCommentSchema.parse(req.body);

    // Vérifier que le commentaire existe et que l'utilisateur est propriétaire
    const existing = await prisma.resourceComment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Commentaire non trouvé', 404, 'COMMENT_NOT_FOUND');
    }

    if (existing.userId !== req.user.userId && req.user.role !== 'admin') {
      throw new AppError('Vous n\'êtes pas propriétaire de ce commentaire', 403, 'NOT_OWNER');
    }

    const comment = await prisma.resourceComment.update({
      where: { id },
      data: {
        content: data.content.trim(),
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

    res.json(comment);
  })
);

/**
 * DELETE /api/comments/:id
 * Supprimer un commentaire
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

    // Vérifier que le commentaire existe et que l'utilisateur est propriétaire
    const existing = await prisma.resourceComment.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Commentaire non trouvé', 404, 'COMMENT_NOT_FOUND');
    }

    if (existing.userId !== req.user.userId && req.user.role !== 'admin') {
      throw new AppError('Vous n\'êtes pas propriétaire de ce commentaire', 403, 'NOT_OWNER');
    }

    // Supprimer le commentaire (les réponses seront supprimées en cascade)
    await prisma.resourceComment.delete({
      where: { id },
    });

    res.status(204).send();
  })
);

export default router;

