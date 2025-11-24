/**
 * Routes pour les tokens API
 */

import express from 'express';
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

const router = express.Router();

// Schémas de validation
const createApiTokenSchema = z.object({
  name: z.string().min(1).max(255),
  expiresInDays: z.number().int().positive().max(365).optional(),
});

/**
 * Génère un token API sécurisé
 */
function generateApiToken(): string {
  return `hub_lib_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * GET /api/api-tokens
 * Liste tous les tokens API de l'utilisateur
 */
router.get(
  '/',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Non authentifié', 401);
    }

    const tokens = await prisma.apiToken.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    });

    // Masquer le token complet, ne montrer que les 8 premiers caractères
    const safeTokens = tokens.map((token) => {
      const tokenPrefix = token.token.substring(0, 8) + '...';
      
      return {
        id: token.id,
        name: token.name,
        tokenPrefix,
        lastUsedAt: token.lastUsedAt,
        expiresAt: token.expiresAt,
        createdAt: token.createdAt,
        isExpired: token.expiresAt ? new Date(token.expiresAt) < new Date() : false,
      };
    });

    res.json({ tokens: safeTokens });
  })
);

/**
 * GET /api/api-tokens/:id
 * Récupère les détails d'un token API
 */
router.get(
  '/:id',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Non authentifié', 401);
    }

    const { id } = req.params;

    const token = await prisma.apiToken.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        token: false,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        userId: true,
      },
    });

    if (!token) {
      throw new AppError('Token API non trouvé', 404);
    }

    // Vérifier que le token appartient à l'utilisateur
    if (token.userId !== req.user.userId) {
      throw new AppError('Accès non autorisé', 403);
    }

    res.json({
      id: token.id,
      name: token.name,
      lastUsedAt: token.lastUsedAt,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
      isExpired: token.expiresAt ? new Date(token.expiresAt) < new Date() : false,
    });
  })
);

/**
 * POST /api/api-tokens
 * Crée un nouveau token API
 */
router.post(
  '/',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Non authentifié', 401);
    }

    const { name, expiresInDays } = createApiTokenSchema.parse(req.body);

    // Générer un token unique
    let token: string;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      token = generateApiToken();
      const existing = await prisma.apiToken.findUnique({
        where: { token },
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      throw new AppError('Erreur lors de la génération du token', 500);
    }

    // Calculer la date d'expiration
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Créer le token
    const apiToken = await prisma.apiToken.create({
      data: {
        userId: req.user.userId,
        token: token!,
        name,
        expiresAt,
      },
    });

    logger.info(`Nouveau token API créé: ${apiToken.id} pour utilisateur ${req.user.userId}`, {
      name,
      expiresAt,
    });

    // Retourner le token complet UNIQUEMENT lors de la création
    res.status(201).json({
      id: apiToken.id,
      name: apiToken.name,
      token: apiToken.token, // Seule fois où on retourne le token complet
      expiresAt: apiToken.expiresAt,
      createdAt: apiToken.createdAt,
      message: '⚠️ Enregistrez ce token maintenant, il ne sera plus affiché !',
    });
  })
);

/**
 * DELETE /api/api-tokens/:id
 * Supprime un token API
 */
router.delete(
  '/:id',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Non authentifié', 401);
    }

    const { id } = req.params;

    // Vérifier que le token existe et appartient à l'utilisateur
    const token = await prisma.apiToken.findUnique({
      where: { id },
      select: { id: true, userId: true, name: true },
    });

    if (!token) {
      throw new AppError('Token API non trouvé', 404);
    }

    if (token.userId !== req.user.userId) {
      throw new AppError('Accès non autorisé', 403);
    }

    // Supprimer le token
    await prisma.apiToken.delete({
      where: { id },
    });

    logger.info(`Token API supprimé: ${id} par utilisateur ${req.user.userId}`, {
      tokenName: token.name,
    });

    res.json({
      message: 'Token API supprimé avec succès',
    });
  })
);

export default router;

