/**
 * Routes d'authentification
 * 
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentification et gestion des sessions utilisateurs
 */

import express, { Request, Response } from 'express';
import { authService } from '../services/authService.js';
import { authRateLimit, oauthRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { signUpSchema, signInSchema } from '../services/authService.js';
import { prisma } from '../config/database.js';
import { sessionService } from '../services/sessionService.js';
import { oauthAccountService } from '../services/oauthAccountService.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Inscription d'un nouvel utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: password123
 *               username:
 *                 type: string
 *                 example: johndoe
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *     responses:
 *       201:
 *         description: Utilisateur créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 tokens:
 *                   type: object
 *                   properties:
 *                     access_token:
 *                       type: string
 *                     refresh_token:
 *                       type: string
 *       400:
 *         description: Erreur de validation
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/signup', authRateLimit, asyncHandler(async (req: Request, res: Response) => {
  // Valider les données d'entrée
  const parsedData = signUpSchema.parse(req.body);
  const data = {
    email: parsedData.email!,
    password: parsedData.password!,
    username: parsedData.username,
    fullName: parsedData.fullName,
  };

  // Inscrire l'utilisateur
  const result = await authService.signUp(data);

  res.status(201).json({
    message: 'Inscription réussie',
    user: result.user,
    tokens: result.tokens,
  });
}));

/**
 * @swagger
 * /api/auth/signin:
 *   post:
 *     summary: Connexion d'un utilisateur
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 tokens:
 *                   type: object
 *                   properties:
 *                     access_token:
 *                       type: string
 *                     refresh_token:
 *                       type: string
 *       401:
 *         description: Email ou mot de passe incorrect
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/signin', authRateLimit, asyncHandler(async (req: Request, res: Response) => {
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
router.post('/signout', asyncHandler(async (req: Request, res: Response) => {
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
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
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
router.get('/session', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  // Le middleware authMiddleware garantit que req.user existe
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

/**
 * GET /api/auth/oauth/github
 * Initie la connexion OAuth avec GitHub
 */
router.get('/oauth/github', oauthRateLimit, asyncHandler(async (req: Request, res: Response) => {
  if (!env.GITHUB_CLIENT_ID) {
    return res.status(503).json({
      error: 'OAuth GitHub non configuré',
      code: 'OAUTH_NOT_CONFIGURED',
    });
  }

  const redirectUri = `${env.API_BASE_URL}/api/auth/oauth/callback/github`;
  const state = (req.query.state as string) || crypto.randomUUID();
  
  // Stocker le state dans la session (ou Redis) pour validation
  // Demander les scopes nécessaires : read:user, user:email pour les infos utilisateur, repo pour gérer les repositories
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user user:email repo&state=${state}`;
  
  res.redirect(githubAuthUrl);
}));

/**
 * GET /api/auth/oauth/callback/github
 * Callback OAuth GitHub
 */
router.get('/oauth/callback/github', oauthRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.query;

  // Extraire l'URL du frontend pour les redirections
  // En production, utiliser l'URL HTTPS si disponible, sinon la première URL de CORS_ORIGIN
  let frontendUrl: string;
  if (env.CORS_ORIGIN.includes(',')) {
    const origins = env.CORS_ORIGIN.split(',').map(o => o.trim());
    // Prioriser l'URL HTTPS en production
    const httpsUrl = origins.find(o => o.startsWith('https://'));
    frontendUrl = httpsUrl || origins[0];
  } else {
    frontendUrl = env.CORS_ORIGIN.trim();
  }
  
  // Si aucune URL HTTPS n'est trouvée et qu'on est en production, utiliser API_BASE_URL
  if (env.NODE_ENV === 'production' && !frontendUrl.startsWith('https://')) {
    frontendUrl = env.API_BASE_URL.replace('/api', '').replace(/\/$/, '') || 'https://hublib.ovh';
  }

  if (!code || typeof code !== 'string') {
    return res.redirect(`${frontendUrl}/auth?error=oauth_error&message=Code manquant`);
  }

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return res.redirect(`${frontendUrl}/auth?error=oauth_error&message=OAuth non configuré`);
  }

  try {
    // Échanger le code contre un access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json() as { 
      error?: string; 
      error_description?: string; 
      access_token?: string;
      scope?: string; // Scopes accordés (séparés par des virgules)
    };

    if (tokenData.error) {
      return res.redirect(`${frontendUrl}/auth?error=oauth_error&message=${tokenData.error_description || tokenData.error}`);
    }

    if (!tokenData.access_token) {
      return res.redirect(`${frontendUrl}/auth?error=oauth_error&message=Token d'accès non reçu`);
    }

    const accessToken = tokenData.access_token;
    
    // Récupérer les scopes accordés (si disponibles dans la réponse)
    // Note: GitHub peut retourner les scopes dans le header X-OAuth-Scopes ou dans la réponse
    const grantedScopes = tokenData.scope 
      ? tokenData.scope.split(',').map(s => s.trim())
      : ['read:user', 'user:email', 'repo']; // Par défaut, on assume les scopes demandés

    // Récupérer les informations utilisateur depuis GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    const githubUser = await userResponse.json() as { email?: string; login: string; name?: string; avatar_url?: string };

    // Récupérer l'email (peut nécessiter un scope supplémentaire)
    let email = githubUser.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      const emails = await emailsResponse.json() as Array<{ email: string; primary?: boolean }>;
      const primaryEmail = emails.find((e) => e.primary);
      email = primaryEmail?.email || emails[0]?.email;
    }

    if (!email) {
      return res.redirect(`${frontendUrl}/auth?error=oauth_error&message=Email non disponible`);
    }

    // Créer ou récupérer l'utilisateur
    let profile = await authService.getUserByEmail(email);
    
    if (!profile) {
      // Créer un nouvel utilisateur
      const userId = crypto.randomUUID();
      const newProfile = await prisma.profile.create({
        data: {
          userId,
          email,
          username: githubUser.login,
          fullName: githubUser.name || githubUser.login,
          avatarUrl: githubUser.avatar_url || null,
          githubUsername: githubUser.login,
        },
      });

      // Créer le rôle utilisateur
      await prisma.userRole.create({
        data: {
          userId,
          role: 'user',
        },
      });

      profile = {
        id: newProfile.id,
        userId: newProfile.userId,
        email: newProfile.email,
        username: newProfile.username,
        fullName: newProfile.fullName,
        avatarUrl: newProfile.avatarUrl,
        bio: newProfile.bio,
        role: 'user',
      };
    } else {
      // Mettre à jour les infos GitHub si nécessaire
      const existingProfile = await prisma.profile.findUnique({
        where: { userId: profile.userId },
      });
      
      if (existingProfile && !existingProfile.githubUsername) {
        await prisma.profile.update({
          where: { userId: profile.userId },
          data: {
            githubUsername: githubUser.login,
            avatarUrl: existingProfile.avatarUrl || githubUser.avatar_url || null,
          },
        });
      }
    }

    // Récupérer le rôle
    const userRole = await prisma.userRole.findUnique({
      where: { userId: profile.userId },
    });

    // Générer les tokens JWT
    const tokens = await authService.generateTokens({
      userId: profile.userId,
      email: profile.email,
      role: userRole?.role,
    });

    // Stocker la session
    await sessionService.createSession(profile.userId, tokens.refreshToken);

    // Lier le compte OAuth GitHub
    try {
      await oauthAccountService.linkOAuthAccount(profile.userId, {
        provider: 'github',
        providerUserId: githubUser.login,
        providerEmail: email,
        accessToken: accessToken,
        scope: grantedScopes, // Utiliser les scopes réellement accordés
        metadata: {
          username: githubUser.login,
          name: githubUser.name,
          avatar_url: githubUser.avatar_url,
        },
        isPrimary: true,
      });
    } catch (error) {
      // Logger l'erreur mais ne pas bloquer la connexion
      logger.warn('Erreur lors de la liaison du compte OAuth GitHub:', error);
    }

    // Rediriger vers le frontend avec les tokens
    const tokensParam = encodeURIComponent(JSON.stringify(tokens));
    res.redirect(`${frontendUrl}/auth?oauth=success&tokens=${tokensParam}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return res.redirect(`${frontendUrl}/auth?error=oauth_error&message=${encodeURIComponent(errorMessage)}`);
  }
}));

/**
 * GET /api/auth/oauth/google
 * Initie la connexion OAuth avec Google
 */
router.get('/oauth/google', oauthRateLimit, asyncHandler(async (req: Request, res: Response) => {
  if (!env.GOOGLE_CLIENT_ID) {
    return res.status(503).json({
      error: 'OAuth Google non configuré',
      code: 'OAUTH_NOT_CONFIGURED',
    });
  }

  const redirectUri = `${env.API_BASE_URL}/api/auth/oauth/callback/google`;
  const state = (req.query.state as string) || crypto.randomUUID();
  
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid email profile https://www.googleapis.com/auth/drive.file&state=${state}`;
  
  res.redirect(googleAuthUrl);
}));

/**
 * GET /api/auth/oauth/callback/google
 * Callback OAuth Google
 */
router.get('/oauth/callback/google', oauthRateLimit, asyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.query;

  // Extraire l'URL du frontend pour les redirections
  // En production, utiliser l'URL HTTPS si disponible, sinon la première URL de CORS_ORIGIN
  let frontendUrl: string;
  if (env.CORS_ORIGIN.includes(',')) {
    const origins = env.CORS_ORIGIN.split(',').map(o => o.trim());
    // Prioriser l'URL HTTPS en production
    const httpsUrl = origins.find(o => o.startsWith('https://'));
    frontendUrl = httpsUrl || origins[0];
  } else {
    frontendUrl = env.CORS_ORIGIN.trim();
  }
  
  // Si aucune URL HTTPS n'est trouvée et qu'on est en production, utiliser API_BASE_URL
  if (env.NODE_ENV === 'production' && !frontendUrl.startsWith('https://')) {
    frontendUrl = env.API_BASE_URL.replace('/api', '').replace(/\/$/, '') || 'https://hublib.ovh';
  }

  if (!code || typeof code !== 'string') {
    return res.redirect(`${frontendUrl}/auth?error=oauth_error&message=Code manquant`);
  }

  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${frontendUrl}/auth?error=oauth_error&message=OAuth non configuré`);
  }

  try {
    // Échanger le code contre un access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${env.API_BASE_URL}/api/auth/oauth/callback/google`,
      }),
    });

    const tokenData = await tokenResponse.json() as { 
      error?: string; 
      error_description?: string; 
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (tokenData.error) {
      return res.redirect(`${frontendUrl}/auth?error=oauth_error&message=${tokenData.error_description || tokenData.error}`);
    }

    if (!tokenData.access_token) {
      return res.redirect(`${frontendUrl}/auth?error=oauth_error&message=Token d'accès non reçu`);
    }

    const accessToken = tokenData.access_token;

    // Récupérer les informations utilisateur depuis Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const googleUser = await userResponse.json() as { email?: string; name?: string; picture?: string };

    if (!googleUser.email) {
      return res.redirect(`${frontendUrl}/auth?error=oauth_error&message=Email non disponible`);
    }

    // Créer ou récupérer l'utilisateur
    let profile = await authService.getUserByEmail(googleUser.email);
    
    if (!profile) {
      // Créer un nouvel utilisateur
      const userId = crypto.randomUUID();
      const newProfile = await prisma.profile.create({
        data: {
          userId,
          email: googleUser.email,
          username: googleUser.email.split('@')[0],
          fullName: googleUser.name || googleUser.email.split('@')[0],
          avatarUrl: googleUser.picture || null,
        },
      });

      // Créer le rôle utilisateur
      await prisma.userRole.create({
        data: {
          userId,
          role: 'user',
        },
      });

      profile = {
        id: newProfile.id,
        userId: newProfile.userId,
        email: newProfile.email,
        username: newProfile.username,
        fullName: newProfile.fullName,
        avatarUrl: newProfile.avatarUrl,
        bio: newProfile.bio,
        role: 'user',
      };
    } else {
      // Mettre à jour l'avatar si nécessaire
      const existingProfile = await prisma.profile.findUnique({
        where: { userId: profile.userId },
      });
      
      if (existingProfile && !existingProfile.avatarUrl && googleUser.picture) {
        await prisma.profile.update({
          where: { userId: profile.userId },
          data: {
            avatarUrl: googleUser.picture,
          },
        });
      }
    }

    // Récupérer le rôle
    const userRole = await prisma.userRole.findUnique({
      where: { userId: profile.userId },
    });

    // Générer les tokens JWT
    const tokens = await authService.generateTokens({
      userId: profile.userId,
      email: profile.email,
      role: userRole?.role,
    });

    // Stocker la session
    await sessionService.createSession(profile.userId, tokens.refreshToken);

    // Lier le compte OAuth Google
    try {
      const tokenExpiresAt = tokenData.expires_in 
        ? new Date(Date.now() + tokenData.expires_in * 1000)
        : undefined;

      await oauthAccountService.linkOAuthAccount(profile.userId, {
        provider: 'google',
        providerUserId: googleUser.email,
        providerEmail: googleUser.email,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt,
        scope: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/drive.file'], // Scopes pour Google Drive
        metadata: {
          name: googleUser.name,
          picture: googleUser.picture,
        },
        isPrimary: true,
      });
    } catch (error) {
      // Logger l'erreur mais ne pas bloquer la connexion
      logger.warn('Erreur lors de la liaison du compte OAuth Google:', error);
    }

    // Rediriger vers le frontend avec les tokens
    const tokensParam = encodeURIComponent(JSON.stringify(tokens));
    res.redirect(`${frontendUrl}/auth?oauth=success&tokens=${tokensParam}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return res.redirect(`${frontendUrl}/auth?error=oauth_error&message=${encodeURIComponent(errorMessage)}`);
  }
}));

export default router;



