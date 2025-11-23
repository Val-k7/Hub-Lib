/**
 * Middleware d'authentification JWT
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';
import { logger } from '../utils/logger.js';

// Étendre l'interface Request pour inclure user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role?: string;
      };
    }
  }
}

/**
 * Middleware d'authentification - vérifie le token JWT
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extraire le token depuis le header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Token d\'authentification manquant',
        code: 'AUTH_TOKEN_MISSING',
      });
      return;
    }

    const token = authHeader.substring(7); // Enlever "Bearer "

    if (!token) {
      res.status(401).json({
        error: 'Token d\'authentification invalide',
        code: 'AUTH_TOKEN_INVALID',
      });
      return;
    }

    // Vérifier et décoder le token
    const payload = authService.verifyAccessToken(token);

    // Récupérer les informations complètes de l'utilisateur
    const user = await authService.getUserById(payload.userId);

    if (!user) {
      res.status(401).json({
        error: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Ajouter l'utilisateur à la requête
    req.user = {
      userId: user.userId,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error: any) {
    logger.warn(`Erreur d'authentification: ${error.message}`);
    res.status(401).json({
      error: error.message || 'Token d\'authentification invalide',
      code: 'AUTH_TOKEN_INVALID',
    });
  }
};

/**
 * Middleware optionnel - ajoute l'utilisateur si un token est présent
 * Ne renvoie pas d'erreur si le token est absent ou invalide
 */
export const optionalAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const payload = authService.verifyAccessToken(token);
        const user = await authService.getUserById(payload.userId);
        
        if (user) {
          req.user = {
            userId: user.userId,
            email: user.email,
            role: user.role,
          };
        }
      } catch (error) {
        // Ignorer les erreurs de token pour ce middleware
        logger.debug(`Token optionnel invalide: ${(error as Error).message}`);
      }
    }

    next();
  } catch (error) {
    // En cas d'erreur, continuer sans authentification
    next();
  }
};

/**
 * Middleware pour vérifier que l'utilisateur a un rôle spécifique
 */
export const requireRole = (role: 'admin' | 'user') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentification requise',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const hasRole = await authService.hasRole(req.user.userId, role);

    if (!hasRole) {
      res.status(403).json({
        error: 'Accès refusé - Rôle insuffisant',
        code: 'INSUFFICIENT_ROLE',
        required: role,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware pour vérifier que l'utilisateur est propriétaire de la ressource
 */
export const requireOwnership = (userIdParam: string = 'userId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentification requise',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const resourceUserId = req.params[userIdParam] || req.body.userId;

    // Les admins peuvent accéder à toutes les ressources
    const isAdmin = req.user.role === 'admin';
    const isOwner = req.user.userId === resourceUserId;

    if (!isAdmin && !isOwner) {
      res.status(403).json({
        error: 'Accès refusé - Vous n\'êtes pas propriétaire de cette ressource',
        code: 'NOT_OWNER',
      });
      return;
    }

    next();
  };
};


