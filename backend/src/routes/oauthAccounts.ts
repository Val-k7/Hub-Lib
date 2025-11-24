/**
 * Routes pour la gestion des comptes OAuth
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { oauthAccountService, type OAuthProvider } from '../services/oauthAccountService.js';
import { generalRateLimit } from '../middleware/rateLimit.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);
router.use(generalRateLimit);

// Schémas de validation
const setPrimarySchema = z.object({
  accountId: z.string().uuid(),
});

/**
 * @swagger
 * /api/oauth-accounts:
 *   get:
 *     summary: Liste tous les comptes OAuth de l'utilisateur
 *     tags: [OAuth Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste des comptes OAuth
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/OAuthAccount'
 *       401:
 *         description: Non authentifié
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const accounts = await oauthAccountService.getUserOAuthAccounts(req.user.userId);

    res.json(accounts);
  })
);

/**
 * @swagger
 * /api/oauth-accounts/{provider}:
 *   get:
 *     summary: Récupère le compte OAuth principal pour un provider
 *     tags: [OAuth Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [github, google]
 *         description: Le provider OAuth
 *     responses:
 *       200:
 *         description: Compte OAuth principal
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OAuthAccount'
 *       404:
 *         description: Aucun compte OAuth trouvé
 */
router.get(
  '/:provider',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { provider } = req.params;

    if (provider !== 'github' && provider !== 'google') {
      throw new AppError('Provider invalide', 400, 'INVALID_PROVIDER');
    }

    const account = await oauthAccountService.getPrimaryOAuthAccount(
      req.user.userId,
      provider as OAuthProvider
    );

    if (!account) {
      return res.status(404).json({
        error: 'Aucun compte OAuth trouvé pour ce provider',
        code: 'OAUTH_ACCOUNT_NOT_FOUND',
      });
    }

    res.json(account);
  })
);

/**
 * @swagger
 * /api/oauth-accounts/{id}:
 *   delete:
 *     summary: Délie un compte OAuth
 *     tags: [OAuth Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du compte OAuth
 *     responses:
 *       200:
 *         description: Compte OAuth délié avec succès
 *       404:
 *         description: Compte OAuth non trouvé
 *       403:
 *         description: Non autorisé
 */
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;

    await oauthAccountService.unlinkOAuthAccount(req.user.userId, id);

    res.json({ message: 'Compte OAuth délié avec succès' });
  })
);

/**
 * @swagger
 * /api/oauth-accounts/{id}/primary:
 *   put:
 *     summary: Définit un compte OAuth comme principal
 *     tags: [OAuth Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du compte OAuth
 *     responses:
 *       200:
 *         description: Compte OAuth défini comme principal
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OAuthAccount'
 *       404:
 *         description: Compte OAuth non trouvé
 *       403:
 *         description: Non autorisé
 */
router.put(
  '/:id/primary',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;

    const account = await oauthAccountService.setPrimaryOAuthAccount(req.user.userId, id);

    res.json(account);
  })
);

/**
 * @swagger
 * /api/oauth-accounts/{id}/refresh:
 *   post:
 *     summary: Rafraîchit le token d'un compte OAuth
 *     tags: [OAuth Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID du compte OAuth
 *     responses:
 *       200:
 *         description: Token rafraîchi avec succès
 *       404:
 *         description: Compte OAuth non trouvé
 *       403:
 *         description: Non autorisé
 */
router.post(
  '/:id/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;

    // Récupérer le compte OAuth
    const account = await oauthAccountService.getOAuthAccountById(id);
    if (!account) {
      throw new AppError('Compte OAuth non trouvé', 404, 'OAUTH_ACCOUNT_NOT_FOUND');
    }

    if (account.userId !== req.user!.userId) {
      throw new AppError('Accès non autorisé', 403, 'FORBIDDEN');
    }

    // Rafraîchir le token selon le provider
    try {
      if (account.provider === 'google') {
        const { googleDriveService } = await import('../services/googleDriveService.js');
        await googleDriveService.refreshGoogleTokenForUser(account.userId);
        res.json({ message: 'Token Google rafraîchi avec succès' });
      } else if (account.provider === 'github') {
        // GitHub OAuth Apps ne supportent pas le refresh token
        // Le token ne expire pas sauf si révoqué manuellement
        res.json({ message: 'GitHub OAuth Apps ne supportent pas le rafraîchissement automatique des tokens' });
      } else {
        throw new AppError('Provider non supporté pour le rafraîchissement', 400, 'UNSUPPORTED_PROVIDER');
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erreur lors du rafraîchissement du token', 500, 'TOKEN_REFRESH_ERROR');
    }
  })
);

export default router;

