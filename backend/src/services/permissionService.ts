/**
 * Service de gestion des permissions
 * 
 * Ce service gère les vérifications de permissions granulaires pour les utilisateurs
 * Il utilise un cache Redis pour optimiser les performances
 */

import { prisma } from '../config/database.js';
import { AppRole } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { roleCacheService } from './roleCacheService.js';

export interface PermissionContext {
  resourceId?: string;
  ownerId?: string;
  isPublic?: boolean;
  isShared?: boolean;
}

class PermissionService {
  /**
   * Vérifie si un utilisateur a un rôle spécifique
   * Utilise le cache Redis pour optimiser les performances
   */
  async hasRole(userId: string, role: AppRole): Promise<boolean> {
    try {
      // Vérifier le cache d'abord
      const cachedRole = await roleCacheService.getCachedUserRole(userId);
      if (cachedRole) {
        return this.compareRoles(cachedRole, role);
      }

      // Si pas dans le cache, récupérer depuis la base de données
      const userRole = await prisma.userRole.findUnique({
        where: { userId },
      });

      if (!userRole) {
        return false;
      }

      // Vérifier si le rôle a expiré
      if (userRole.expiresAt && userRole.expiresAt < new Date()) {
        // Le rôle a expiré, retourner false
        return false;
      }

      // Mettre en cache
      await roleCacheService.cacheUserRole(userId, userRole.role);

      return this.compareRoles(userRole.role, role);
    } catch (error) {
      logger.error(`Erreur lors de la vérification du rôle pour ${userId}:`, error);
      return false;
    }
  }

  /**
   * Compare deux rôles selon la hiérarchie
   * Retourne true si le rôle de l'utilisateur est >= au rôle requis
   */
  private compareRoles(userRole: AppRole, requiredRole: AppRole): boolean {
    const roleHierarchy: Record<AppRole, number> = {
      guest: 0,
      user: 1,
      moderator: 2,
      admin: 3,
      super_admin: 4,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }

  /**
   * Récupère le rôle d'un utilisateur (avec cache)
   */
  async getUserRole(userId: string): Promise<AppRole | null> {
    try {
      // Vérifier le cache d'abord
      const cachedRole = await roleCacheService.getCachedUserRole(userId);
      if (cachedRole) {
        return cachedRole;
      }

      // Récupérer depuis la base de données
      const userRole = await prisma.userRole.findUnique({
        where: { userId },
      });

      if (!userRole) {
        return null;
      }

      // Vérifier si le rôle a expiré
      if (userRole.expiresAt && userRole.expiresAt < new Date()) {
        return null;
      }

      // Mettre en cache
      await roleCacheService.cacheUserRole(userId, userRole.role);

      return userRole.role;
    } catch (error) {
      logger.error(`Erreur lors de la récupération du rôle pour ${userId}:`, error);
      return null;
    }
  }

  /**
   * Vérifie si un utilisateur a une permission spécifique
   * Vérifie d'abord le rôle, puis les permissions granulaires
   */
  async hasPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    try {
      // Récupérer le rôle de l'utilisateur
      const userRole = await this.getUserRole(userId);
      if (!userRole) {
        return false;
      }

      // Vérifier si la permission existe
      const permission = await prisma.permission.findUnique({
        where: {
          name: `${resource}:${action}`,
        },
        include: {
          rolePermissions: {
            where: {
              role: userRole,
            },
          },
        },
      });

      if (!permission) {
        logger.warn(`Permission "${resource}:${action}" non trouvée`);
        return false;
      }

      // Vérifier si le rôle a cette permission
      return permission.rolePermissions.length > 0;
    } catch (error) {
      logger.error(
        `Erreur lors de la vérification de la permission "${resource}:${action}" pour ${userId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Vérifie les permissions avec contexte (conditions supplémentaires)
   * Permet de vérifier des conditions comme la propriété, la visibilité, etc.
   */
  async checkPermission(
    userId: string,
    resource: string,
    action: string,
    context?: PermissionContext
  ): Promise<boolean> {
    try {
      // Vérifier la permission de base
      const hasBasePermission = await this.hasPermission(userId, resource, action);
      if (!hasBasePermission) {
        // Vérifier les permissions au niveau de la ressource (partages, etc.)
      const hasResourcePermission = await this.hasResourceLevelPermission(
          userId,
          action,
          context
        );

        if (!hasResourcePermission) {
          return false;
        }
      }

      // Vérifier les conditions contextuelles
      if (context) {
        // Si l'utilisateur est propriétaire, il a toujours accès
        if (context.ownerId === userId) {
          return true;
        }

        // Vérifier si c'est public
        if (context.isPublic && action === 'read') {
          return true;
        }

        // Vérifier si c'est partagé
        if (context.isShared && action === 'read') {
          return true;
        }

        // Pour les actions de modification/suppression, vérifier la propriété
        if (['write', 'delete', 'moderate'].includes(action)) {
          // Les admins et modérateurs peuvent modifier/supprimer
          const userRole = await this.getUserRole(userId);
          if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'moderator') {
            return true;
          }

          // Sinon, seulement le propriétaire
          return context.ownerId === userId;
        }
      }

      return true;
    } catch (error) {
      logger.error(
        `Erreur lors de la vérification de la permission avec contexte pour ${userId}:`,
        error
      );
      return false;
    }
  }

  /**
   * Récupère toutes les permissions d'un utilisateur
   * Utilise le cache pour optimiser les performances
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    try {
      // Vérifier le cache d'abord
      const cachedPermissions = await roleCacheService.getCachedUserPermissions(userId);
      if (cachedPermissions) {
        return cachedPermissions.map((p) => p.name);
      }

      // Récupérer le rôle de l'utilisateur
      const userRole = await this.getUserRole(userId);
      if (!userRole) {
        return [];
      }

      // Récupérer toutes les permissions du rôle
      const rolePermissions = await prisma.rolePermission.findMany({
        where: {
          role: userRole,
        },
        include: {
          permission: true,
        },
      });

      const permissions = rolePermissions.map((rp) => rp.permission);

      // Mettre en cache
      await roleCacheService.cacheUserPermissions(userId, permissions);

      return permissions.map((p) => p.name);
    } catch (error) {
      logger.error(`Erreur lors de la récupération des permissions pour ${userId}:`, error);
      return [];
    }
  }

  /**
   * Invalide le cache d'un utilisateur (appelé lors des changements de rôle)
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await roleCacheService.invalidateUserRole(userId);
    await roleCacheService.invalidateUserPermissions(userId);
  }

  /**
   * Vérifie si un utilisateur peut effectuer une action sur une ressource
   * Méthode utilitaire combinant plusieurs vérifications
   */
  async canPerformAction(
    userId: string,
    resource: string,
    action: string,
    context?: PermissionContext
  ): Promise<boolean> {
    // Vérifier la permission de base
    const hasPermission = await this.hasPermission(userId, resource, action);
    if (!hasPermission) {
      return false;
    }

    // Vérifier les conditions contextuelles si fournies
    if (context) {
      return await this.checkPermission(userId, resource, action, context);
    }

    return true;
  }

  /**
   * Vérifie si l'utilisateur dispose d'une permission au niveau de la ressource
   * via les partages (resource_shares) ou la propriété
   */
  private async hasResourceLevelPermission(
    userId: string,
    action: string,
    context?: PermissionContext
  ): Promise<boolean> {
    if (!context?.resourceId) {
      return false;
    }

    // Le propriétaire possède toujours l'accès complet
    if (context.ownerId === userId) {
      return true;
    }

    // Si la ressource est publique, autoriser la lecture
    if (context.isPublic && action === 'read') {
      return true;
    }

    // Récupérer les groupes de l'utilisateur (utilisé pour partages et permissions)
    const groupMemberships = await prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });

    const groupIds = groupMemberships.map((group) => group.groupId);
    const shareAccess = await this.hasShareBasedPermission(context.resourceId, userId, groupIds, action);
    if (shareAccess) {
      return true;
    }

    // Vérifier les permissions directes sur la ressource
    const directPermission = await prisma.resourcePermission.findFirst({
      where: {
        resourceId: context.resourceId,
        permission: action,
        AND: [
          {
            OR: [
              { userId },
              ...(groupIds.length > 0 ? [{ groupId: { in: groupIds } }] : []),
            ],
          },
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        ],
      },
    });

    return Boolean(directPermission);
  }

  private async hasShareBasedPermission(
    resourceId: string,
    userId: string,
    groupIds: string[],
    action: string
  ): Promise<boolean> {
    const normalizedAction = action.toLowerCase();
    const readActions = ['read', 'view'];
    const writeActions = ['write', 'update', 'delete', 'moderate', 'share'];

    const share = await prisma.resourceShare.findFirst({
      where: {
        resourceId,
        AND: [
          {
            OR: [
              { sharedWithUserId: userId },
              ...(groupIds.length > 0 ? [{ sharedWithGroupId: { in: groupIds } }] : []),
            ],
          },
          {
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        ],
      },
    });

    if (!share) {
      return false;
    }

    if (share.permission === 'read') {
      return readActions.includes(normalizedAction);
    }

    return readActions.includes(normalizedAction) || writeActions.includes(normalizedAction);
  }
}

export const permissionService = new PermissionService();

