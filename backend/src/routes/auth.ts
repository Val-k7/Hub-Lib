/**
 * Routes d'authentification
 */

import express from 'express';
import { authService } from '../services/authService.js';
import { authRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { signUpSchema, signInSchema } from '../services/authService.js';

const router = express.Router();

/**
 * POST /api/auth/signup
 * Inscription d'un nouvel utilisateur
 */
router.post('/signup', authRateLimit, asyncHandler(async (req, res) => {
  // Valider les données d'entrée
  const data = signUpSchema.parse(req.body);

  // Inscrire l'utilisateur
  const result = await authService.signUp(data);

  res.status(201).json({
    message: 'Inscription réussie',
    user: result.user,
    tokens: result.tokens,
  });
}));

/**
 * POST /api/auth/signin
 * Connexion d'un utilisateur
 */
router.post('/signin', authRateLimit, asyncHandler(async (req, res) => {
  // Valider les données d'entrée
  const { email, password } = signInSchema.parse(req.body);

  // Connecter l'utilisateur
  const result = await authService.signIn(email, password);

  res.json({
    message: 'Connexion réussie',
    user: result.user,
    tokens: result.tokens,
  });
}));

/**
 * POST /api/auth/signout
 * Déconnexion d'un utilisateur
 */
router.post('/signout', asyncHandler(async (req, res) => {
  const refreshToken = req.body.refreshToken;

  if (!refreshToken) {
    return res.status(400).json({
      error: 'Refresh token requis',
      code: 'REFRESH_TOKEN_REQUIRED',
    });
  }

  // Récupérer le userId depuis le refresh token
  try {
    const payload = authService.verifyRefreshToken(refreshToken);
    await authService.signOut(payload.userId, refreshToken);
  } catch (error) {
    // Même si le token est invalide, on considère la déconnexion comme réussie
    // pour éviter de révéler des informations sur la validité du token
  }

  res.json({
    message: 'Déconnexion réussie',
  });
}));

/**
 * POST /api/auth/refresh
 * Rafraîchir les tokens
 */
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({
      error: 'Refresh token requis',
      code: 'REFRESH_TOKEN_REQUIRED',
    });
  }

  // Rafraîchir les tokens
  const tokens = await authService.refreshTokens(refreshToken);

  res.json({
    message: 'Tokens rafraîchis',
    tokens,
  });
}));

/**
 * GET /api/auth/session
 * Récupérer la session actuelle (nécessite authentification)
 */
router.get('/session', asyncHandler(async (req, res) => {
  // Le middleware authMiddleware doit être ajouté dans server.ts
  // Pour l'instant, on suppose que req.user existe
  if (!req.user) {
    return res.status(401).json({
      error: 'Non authentifié',
      code: 'NOT_AUTHENTICATED',
    });
  }

  const user = await authService.getUserById(req.user.userId);

  if (!user) {
    return res.status(404).json({
      error: 'Utilisateur non trouvé',
      code: 'USER_NOT_FOUND',
    });
  }

  res.json({
    user,
  });
}));

export default router;


