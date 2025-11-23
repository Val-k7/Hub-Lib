/**
 * Routes pour les suggestions et votes
 */

import express from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { cacheService } from '../services/cacheService.js';
import { voteService } from '../services/voteService.js';

const router = express.Router();

// Schémas de validation
const createSuggestionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  type: z.enum(['category', 'tag', 'resource_type', 'filter']),
});

const voteSchema = z.object({
  voteType: z.enum(['upvote', 'downvote']),
});

const suggestionFiltersSchema = z.object({
  type: z.enum(['category', 'tag', 'resource_type', 'filter']).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional().default('1'),
  limit: z.string().transform(Number).pipe(z.number().int().positive().max(100)).optional().default('20'),
  sortBy: z.enum(['votes_count', 'created_at']).optional().default('votes_count'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

/**
 * GET /api/suggestions
 * Liste des suggestions
 */
router.get(
  '/',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    const filters = suggestionFiltersSchema.parse(req.query);
    const skip = (filters.page - 1) * filters.limit;

    const where: any = {};

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    // Cache key
    const cacheKey = `suggestions:${JSON.stringify(where)}:${filters.page}:${filters.limit}:${filters.sortBy}:${filters.sortOrder}`;

    // Essayer de récupérer depuis le cache si approuvées seulement
    if (filters.status === 'approved' && !req.user) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }
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
          _count: {
            select: {
              suggestionVotes: true,
            },
          },
        },
        orderBy: {
          [filters.sortBy]: filters.sortOrder,
        },
        skip,
        take: filters.limit,
      }),
      prisma.categoryTagSuggestion.count({ where }),
    ]);

    // Ajouter les votes de l'utilisateur s'il est authentifié
    if (req.user) {
      const suggestionIds = suggestions.map((s) => s.id);
      const userVotes = await prisma.suggestionVote.findMany({
        where: {
          suggestionId: { in: suggestionIds },
          userId: req.user.userId,
        },
      });

      const votesMap = new Map(userVotes.map((v) => [v.suggestionId, v.voteType]));

      suggestions.forEach((suggestion) => {
        (suggestion as any).userVote = votesMap.get(suggestion.id) || null;
      });
    }

    const result = {
      data: suggestions,
      meta: {
        total,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    };

    // Mettre en cache si approuvées seulement et non authentifié
    if (filters.status === 'approved' && !req.user) {
      await cacheService.set(cacheKey, result, { ttl: 3600 }); // 1 heure
    }

    res.json(result);
  })
);

/**
 * GET /api/suggestions/:id
 * Détails d'une suggestion
 */
router.get(
  '/:id',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const suggestion = await prisma.categoryTagSuggestion.findUnique({
      where: { id },
      include: {
        suggestedByProfile: {
          select: {
            userId: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        reviewedByProfile: {
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
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!suggestion) {
      throw new AppError('Suggestion non trouvée', 404, 'SUGGESTION_NOT_FOUND');
    }

    // Ajouter le vote de l'utilisateur s'il est authentifié
    if (req.user) {
      const userVote = await prisma.suggestionVote.findUnique({
        where: {
          suggestionId_userId: {
            suggestionId: id,
            userId: req.user.userId,
          },
        },
      });

      (suggestion as any).userVote = userVote?.voteType || null;
    }

    res.json(suggestion);
  })
);

/**
 * POST /api/suggestions
 * Créer une suggestion
 */
router.post(
  '/',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const data = createSuggestionSchema.parse(req.body);

    // Vérifier si une suggestion avec le même nom et type existe déjà
    const existing = await prisma.categoryTagSuggestion.findUnique({
      where: {
        name_type: {
          name: data.name,
          type: data.type,
        },
      },
    });

    if (existing) {
      if (existing.status === 'approved') {
        throw new AppError('Cette suggestion a déjà été approuvée', 409, 'ALREADY_APPROVED');
      }
      if (existing.status === 'pending') {
        throw new AppError('Une suggestion similaire est déjà en attente', 409, 'ALREADY_PENDING');
      }
    }

    const suggestion = await prisma.categoryTagSuggestion.create({
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        status: 'pending',
        suggestedBy: req.user.userId,
        votesCount: 0,
      },
      include: {
        suggestedByProfile: {
          select: {
            userId: true,
            username: true,
            fullName: true,
          },
        },
      },
    });

    // Invalider le cache
    await cacheService.invalidatePattern('suggestions:*');

    res.status(201).json(suggestion);
  })
);

/**
 * POST /api/suggestions/:id/vote
 * Voter sur une suggestion (utilise voteService pour temps réel)
 */
router.post(
  '/:id/vote',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id: suggestionId } = req.params;
    const { voteType } = voteSchema.parse(req.body);

    // Utiliser le voteService pour gérer le vote avec Redis
    const result = await voteService.voteOnSuggestion(suggestionId, req.user.userId, voteType);

    // Invalider le cache
    await cacheService.invalidatePattern('suggestions:*');

    // Récupérer la suggestion mise à jour
    const updated = await prisma.categoryTagSuggestion.findUnique({
      where: { id: suggestionId },
      include: {
        suggestedByProfile: {
          select: {
            userId: true,
            username: true,
            fullName: true,
          },
        },
        _count: {
          select: {
            suggestionVotes: true,
          },
        },
      },
    });

    res.json({
      message: result.userVote ? 'Vote enregistré' : 'Vote supprimé',
      suggestion: updated,
      votes: {
        totalUpvotes: result.totalUpvotes,
        totalDownvotes: result.totalDownvotes,
        userVote: result.userVote,
      },
    });
  })
);

/**
 * DELETE /api/suggestions/:id/vote
 * Supprimer son vote sur une suggestion (utilise voteService)
 */
router.delete(
  '/:id/vote',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req, res) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id: suggestionId } = req.params;

    // Récupérer le vote actuel de l'utilisateur
    const currentVote = await voteService.getUserVote(suggestionId, req.user.userId);

    if (!currentVote) {
      throw new AppError('Aucun vote trouvé', 404, 'VOTE_NOT_FOUND');
    }

    // Utiliser voteService pour supprimer le vote (en votant de la même manière)
    const result = await voteService.voteOnSuggestion(suggestionId, req.user.userId, currentVote);

    // Invalider le cache
    await cacheService.invalidatePattern('suggestions:*');

    res.json({
      message: 'Vote supprimé',
      votes: {
        totalUpvotes: result.totalUpvotes,
        totalDownvotes: result.totalDownvotes,
        userVote: null,
      },
    });
  })
);

export default router;

