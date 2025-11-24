/**
 * Middleware de vérification des permissions
 * 
 * Permet de vérifier les permissions granulaires pour les routes
 */

import { Request, Response, NextFunction } from 'express';
import { permissionService } from '../services/permissionService.js';
import { logger } from '../utils/logger.js';
import type { PermissionContext } from '../services/permissionService.js';

/**
 * Middleware pour vérifier qu'un utilisateur a une permission spécifique
 * 
 * @param resource - Type de ressource (ex: 'resource', 'template', 'suggestion')
 * @param action - Action requise (ex: 'read', 'write', 'delete')
 * @param getContext - Fonction optionnelle pour extraire le contexte depuis la requête
 */
export const requirePermission = (
  resource: string,
  action: string,
  getContext?: (req: Request) => PermissionContext
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentification requise',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      // Extraire le contexte si fourni
      const context = getContext ? getContext(req) : undefined;

      // Vérifier la permission
      const hasPermission = await permissionService.checkPermission(
        req.user.userId,
        resource,
        action,
        context
      );

      if (!hasPermission) {
        logger.warn(
          `Accès refusé: ${req.user.userId} n'a pas la permission ${resource}:${action}`
        );
        res.status(403).json({
          error: 'Permission insuffisante',
          code: 'INSUFFICIENT_PERMISSION',
          required: { resource, action },
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Erreur lors de la vérification de permission:', error);
      res.status(500).json({
        error: 'Erreur lors de la vérification de permission',
        code: 'PERMISSION_CHECK_ERROR',
      });
    }
  };
};

/**
 * Middleware pour vérifier qu'un utilisateur a un rôle spécifique ou supérieur
 * 
 * @param requiredRole - Rôle minimum requis
 */
export const requireRole = (requiredRole: 'super_admin' | 'admin' | 'moderator' | 'user' | 'guest') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentification requise',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const hasRole = await permissionService.hasRole(req.user.userId, requiredRole);

      if (!hasRole) {
        logger.warn(
          `Accès refusé: ${req.user.userId} n'a pas le rôle ${requiredRole}`
        );
        res.status(403).json({
          error: 'Rôle insuffisant',
          code: 'INSUFFICIENT_ROLE',
          required: requiredRole,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Erreur lors de la vérification de rôle:', error);
      res.status(500).json({
        error: 'Erreur lors de la vérification de rôle',
        code: 'ROLE_CHECK_ERROR',
      });
    }
  };
};

/**
 * Middleware pour vérifier qu'un utilisateur est propriétaire d'une ressource
 * 
 * @param getResourceOwnerId - Fonction pour extraire l'ID du propriétaire depuis la requête
 * @param allowAdmin - Si true, les admins peuvent accéder même s'ils ne sont pas propriétaire
 */
export const requireOwnership = (
  getResourceOwnerId: (req: Request) => string | null | undefined,
  allowAdmin: boolean = true
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentification requise',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const resourceOwnerId = getResourceOwnerId(req);

      if (!resourceOwnerId) {
        res.status(400).json({
          error: 'ID du propriétaire non trouvé',
          code: 'OWNER_ID_MISSING',
        });
        return;
      }

      // Vérifier si l'utilisateur est propriétaire
      const isOwner = req.user.userId === resourceOwnerId;

      // Vérifier si l'utilisateur est admin (si autorisé)
      let isAdmin = false;
      if (allowAdmin) {
        isAdmin = await permissionService.hasRole(req.user.userId, 'admin');
      }

      if (!isOwner && !isAdmin) {
        logger.warn(
          `Accès refusé: ${req.user.userId} n'est pas propriétaire de la ressource ${resourceOwnerId}`
        );
        res.status(403).json({
          error: 'Vous n\'êtes pas propriétaire de cette ressource',
          code: 'NOT_OWNER',
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Erreur lors de la vérification de propriété:', error);
      res.status(500).json({
        error: 'Erreur lors de la vérification de propriété',
        code: 'OWNERSHIP_CHECK_ERROR',
      });
    }
  };
};

/**
 * Middleware pour vérifier plusieurs permissions (toutes doivent être satisfaites)
 * 
 * @param permissions - Liste des permissions requises
 */
export const requireAllPermissions = (
  permissions: Array<{ resource: string; action: string }>,
  getContext?: (req: Request) => PermissionContext
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentification requise',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const context = getContext ? getContext(req) : undefined;

      // Vérifier toutes les permissions
      const checks = await Promise.all(
        permissions.map((perm) =>
          permissionService.checkPermission(req.user.userId, perm.resource, perm.action, context)
        )
      );

      const allGranted = checks.every((granted) => granted);

      if (!allGranted) {
        logger.warn(
          `Accès refusé: ${req.user.userId} n'a pas toutes les permissions requises`
        );
        res.status(403).json({
          error: 'Permissions insuffisantes',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: permissions,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Erreur lors de la vérification de permissions:', error);
      res.status(500).json({
        error: 'Erreur lors de la vérification de permissions',
        code: 'PERMISSIONS_CHECK_ERROR',
      });
    }
  };
};

/**
 * Middleware pour vérifier au moins une permission parmi plusieurs
 * 
 * @param permissions - Liste des permissions (au moins une doit être satisfaite)
 */
export const requireAnyPermission = (
  permissions: Array<{ resource: string; action: string }>,
  getContext?: (req: Request) => PermissionContext
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'Authentification requise',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const context = getContext ? getContext(req) : undefined;

      // Vérifier au moins une permission
      const checks = await Promise.all(
        permissions.map((perm) =>
          permissionService.checkPermission(req.user.userId, perm.resource, perm.action, context)
        )
      );

      const anyGranted = checks.some((granted) => granted);

      if (!anyGranted) {
        logger.warn(
          `Accès refusé: ${req.user.userId} n'a aucune des permissions requises`
        );
        res.status(403).json({
          error: 'Aucune permission suffisante',
          code: 'NO_PERMISSION',
          required: permissions,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Erreur lors de la vérification de permissions:', error);
      res.status(500).json({
        error: 'Erreur lors de la vérification de permissions',
        code: 'PERMISSIONS_CHECK_ERROR',
      });
    }
  };
};

