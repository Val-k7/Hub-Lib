/**
 * Service de cache pour les rôles et permissions
 * 
 * Utilise Redis pour mettre en cache les rôles et permissions des utilisateurs
 * Améliore significativement les performances en évitant les requêtes répétées à la base de données
 */

import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';
import { AppRole } from '@prisma/client';

const CACHE_TTL = 3600; // 1 heure en secondes
const ROLE_CACHE_PREFIX = 'user:role:';
const PERMISSIONS_CACHE_PREFIX = 'user:permissions:';

interface CachedPermission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string | null;
}

class RoleCacheService {
  /**
   * Cache le rôle d'un utilisateur
   */
  async cacheUserRole(userId: string, role: AppRole, ttl: number = CACHE_TTL): Promise<void> {
    try {
      const key = `${ROLE_CACHE_PREFIX}${userId}`;
      await redis.setex(key, ttl, role);
    } catch (error) {
      logger.warn(`Erreur lors de la mise en cache du rôle pour ${userId}:`, error);
      // Ne pas faire échouer la requête si le cache échoue
    }
  }

  /**
   * Récupère le rôle depuis le cache
   */
  async getCachedUserRole(userId: string): Promise<AppRole | null> {
    try {
      const key = `${ROLE_CACHE_PREFIX}${userId}`;
      const cached = await redis.get(key);
      
      if (!cached) {
        return null;
      }

      return cached as AppRole;
    } catch (error) {
      logger.warn(`Erreur lors de la récupération du rôle en cache pour ${userId}:`, error);
      return null;
    }
  }

  /**
   * Invalide le cache du rôle d'un utilisateur
   */
  async invalidateUserRole(userId: string): Promise<void> {
    try {
      const key = `${ROLE_CACHE_PREFIX}${userId}`;
      await redis.del(key);
    } catch (error) {
      logger.warn(`Erreur lors de l'invalidation du cache du rôle pour ${userId}:`, error);
    }
  }

  /**
   * Cache les permissions d'un utilisateur
   */
  async cacheUserPermissions(
    userId: string,
    permissions: CachedPermission[],
    ttl: number = CACHE_TTL
  ): Promise<void> {
    try {
      const key = `${PERMISSIONS_CACHE_PREFIX}${userId}`;
      const serialized = JSON.stringify(permissions);
      await redis.setex(key, ttl, serialized);
    } catch (error) {
      logger.warn(`Erreur lors de la mise en cache des permissions pour ${userId}:`, error);
      // Ne pas faire échouer la requête si le cache échoue
    }
  }

  /**
   * Récupère les permissions depuis le cache
   */
  async getCachedUserPermissions(userId: string): Promise<CachedPermission[] | null> {
    try {
      const key = `${PERMISSIONS_CACHE_PREFIX}${userId}`;
      const cached = await redis.get(key);
      
      if (!cached) {
        return null;
      }

      return JSON.parse(cached) as CachedPermission[];
    } catch (error) {
      logger.warn(`Erreur lors de la récupération des permissions en cache pour ${userId}:`, error);
      return null;
    }
  }

  /**
   * Invalide le cache des permissions d'un utilisateur
   */
  async invalidateUserPermissions(userId: string): Promise<void> {
    try {
      const key = `${PERMISSIONS_CACHE_PREFIX}${userId}`;
      await redis.del(key);
    } catch (error) {
      logger.warn(`Erreur lors de l'invalidation du cache des permissions pour ${userId}:`, error);
    }
  }

  /**
   * Invalide tous les caches d'un utilisateur (rôle + permissions)
   */
  async invalidateAllUserCaches(userId: string): Promise<void> {
    await Promise.all([
      this.invalidateUserRole(userId),
      this.invalidateUserPermissions(userId),
    ]);
  }

  /**
   * Récupère plusieurs rôles en une seule requête (optimisation)
   */
  async getCachedUserRoles(userIds: string[]): Promise<Map<string, AppRole>> {
    const result = new Map<string, AppRole>();

    if (userIds.length === 0) {
      return result;
    }

    try {
      const keys = userIds.map((id) => `${ROLE_CACHE_PREFIX}${id}`);
      const values = await redis.mget(...keys);

      values.forEach((value, index) => {
        if (value) {
          result.set(userIds[index], value as AppRole);
        }
      });
    } catch (error) {
      logger.warn('Erreur lors de la récupération en batch des rôles:', error);
    }

    return result;
  }

  /**
   * Nettoie les caches expirés (méthode utilitaire)
   * Note: Redis gère automatiquement l'expiration, cette méthode est optionnelle
   */
  async clearExpiredCaches(): Promise<void> {
    // Redis gère automatiquement l'expiration avec TTL
    // Cette méthode peut être utilisée pour un nettoyage manuel si nécessaire
    logger.debug('Nettoyage des caches expirés (géré automatiquement par Redis)');
  }
}

export const roleCacheService = new RoleCacheService();

