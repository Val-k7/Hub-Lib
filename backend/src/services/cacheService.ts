/**
 * Service de cache Redis
 */

import { redis } from '../config/redis.js';
import { logger } from '../utils/logger.js';

interface CacheOptions {
  ttl?: number; // Time to live en secondes
}

class CacheService {
  private readonly CACHE_PREFIX = 'cache:';

  /**
   * Récupère une valeur du cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      const value = await redis.get(cacheKey);

      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error: any) {
      logger.error(`Erreur lors de la récupération du cache ${key}:`, error);
      return null;
    }
  }

  /**
   * Stocke une valeur dans le cache
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      const serialized = JSON.stringify(value);

      if (options.ttl) {
        await redis.setex(cacheKey, options.ttl, serialized);
      } else {
        await redis.set(cacheKey, serialized);
      }
    } catch (error: any) {
      logger.error(`Erreur lors de l'enregistrement du cache ${key}:`, error);
    }
  }

  /**
   * Supprime une valeur du cache
   */
  async delete(key: string): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      await redis.del(cacheKey);
    } catch (error: any) {
      logger.error(`Erreur lors de la suppression du cache ${key}:`, error);
    }
  }

  /**
   * Supprime plusieurs valeurs du cache
   */
  async deleteMany(keys: string[]): Promise<void> {
    try {
      const cacheKeys = keys.map((key) => `${this.CACHE_PREFIX}${key}`);
      if (cacheKeys.length > 0) {
        await redis.del(...cacheKeys);
      }
    } catch (error: any) {
      logger.error(`Erreur lors de la suppression de plusieurs caches:`, error);
    }
  }

  /**
   * Vérifie si une clé existe dans le cache
   */
  async has(key: string): Promise<boolean> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      const exists = await redis.exists(cacheKey);
      return exists === 1;
    } catch (error: any) {
      logger.error(`Erreur lors de la vérification du cache ${key}:`, error);
      return false;
    }
  }

  /**
   * Récupère ou calcule une valeur avec mise en cache automatique
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Essayer de récupérer depuis le cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Si pas en cache, exécuter le fetcher
    const value = await fetcher();

    // Mettre en cache
    await this.set(key, value, options);

    return value;
  }

  /**
   * Invalide un pattern de cache (utilise les wildcards Redis)
   */
  async invalidatePattern(pattern: string): Promise<number> {
    try {
      const cachePattern = `${this.CACHE_PREFIX}${pattern}`;
      const keys = await redis.keys(cachePattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
      }

      return keys.length;
    } catch (error: any) {
      logger.error(`Erreur lors de l'invalidation du pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Nettoie tous les caches expirés (appelé périodiquement)
   */
  async cleanup(): Promise<number> {
    try {
      // Redis supprime automatiquement les clés expirées
      // Mais on peut vérifier les clés avec TTL négatif
      const pattern = `${this.CACHE_PREFIX}*`;
      const keys = await redis.keys(pattern);
      let cleaned = 0;

      for (const key of keys) {
        const ttl = await redis.ttl(key);
        if (ttl === -1) {
          // Clé sans expiration, la supprimer si nécessaire
          // (ou la garder selon votre stratégie)
        } else if (ttl === -2) {
          // Clé déjà expirée, la supprimer explicitement
          await redis.del(key);
          cleaned++;
        }
      }

      return cleaned;
    } catch (error: any) {
      logger.error('Erreur lors du nettoyage du cache:', error);
      return 0;
    }
  }

  /**
   * Incrémente une valeur numérique dans le cache
   */
  async increment(key: string, by: number = 1): Promise<number> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      return await redis.incrby(cacheKey, by);
    } catch (error: any) {
      logger.error(`Erreur lors de l'incrémentation du cache ${key}:`, error);
      throw error;
    }
  }

  /**
   * Définir l'expiration d'une clé existante
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}${key}`;
      const result = await redis.expire(cacheKey, ttl);
      return result === 1;
    } catch (error: any) {
      logger.error(`Erreur lors de la définition de l'expiration pour ${key}:`, error);
      return false;
    }
  }

  /**
   * Clés de cache pré-définies
   */
  static readonly Keys = {
    categories: 'categories',
    tags: 'tags',
    resourcePopular: (limit: number) => `resources:popular:limit:${limit}`,
    profile: (userId: string) => `profile:${userId}`,
    collection: (collectionId: string) => `collection:${collectionId}`,
    resource: (resourceId: string) => `resource:${resourceId}`,
  };

  /**
   * TTL pré-définis (en secondes)
   */
  static readonly TTL = {
    categories: 60 * 60, // 1 heure
    tags: 60 * 60, // 1 heure
    resourcePopular: 15 * 60, // 15 minutes
    profile: 30 * 60, // 30 minutes
    collection: 60 * 60, // 1 heure
    resource: 10 * 60, // 10 minutes
  };

  /**
   * Invalidation intelligente : invalide les caches liés à une ressource
   */
  async invalidateResourceCache(resourceId: string): Promise<void> {
    try {
      const keysToInvalidate = [
        CacheService.Keys.resource(resourceId),
        CacheService.Keys.resourcePopular(10),
        CacheService.Keys.resourcePopular(20),
        CacheService.Keys.resourcePopular(50),
      ];

      await this.deleteMany(keysToInvalidate);
      logger.debug(`Cache invalidé pour la ressource ${resourceId}`);
    } catch (error: any) {
      logger.error(`Erreur lors de l'invalidation du cache de ressource: ${error.message}`);
    }
  }

  /**
   * Invalidation intelligente : invalide les caches liés à un profil
   */
  async invalidateProfileCache(userId: string): Promise<void> {
    try {
      await this.delete(CacheService.Keys.profile(userId));
      // Invalider aussi les ressources populaires car elles peuvent inclure les ressources de cet utilisateur
      await this.invalidatePattern('resources:popular:*');
      logger.debug(`Cache invalidé pour le profil ${userId}`);
    } catch (error: any) {
      logger.error(`Erreur lors de l'invalidation du cache de profil: ${error.message}`);
    }
  }

  /**
   * Invalidation intelligente : invalide les caches liés à une collection
   */
  async invalidateCollectionCache(collectionId: string): Promise<void> {
    try {
      await this.delete(CacheService.Keys.collection(collectionId));
      logger.debug(`Cache invalidé pour la collection ${collectionId}`);
    } catch (error: any) {
      logger.error(`Erreur lors de l'invalidation du cache de collection: ${error.message}`);
    }
  }

  /**
   * Invalidation intelligente : invalide les caches liés aux catégories/tags
   */
  async invalidateCategoriesCache(): Promise<void> {
    try {
      await this.delete(CacheService.Keys.categories);
      await this.delete(CacheService.Keys.tags);
      logger.debug('Cache invalidé pour les catégories et tags');
    } catch (error: any) {
      logger.error(`Erreur lors de l'invalidation du cache de catégories: ${error.message}`);
    }
  }

  /**
   * Invalidation intelligente : invalide tous les caches de ressources populaires
   */
  async invalidatePopularResourcesCache(): Promise<void> {
    try {
      await this.invalidatePattern('resources:popular:*');
      logger.debug('Cache invalidé pour les ressources populaires');
    } catch (error: any) {
      logger.error(`Erreur lors de l'invalidation du cache de ressources populaires: ${error.message}`);
    }
  }

  /**
   * Invalidation en cascade : invalide tous les caches liés à une opération
   * Utile après des opérations qui affectent plusieurs types de données
   */
  async invalidateCascade(options: {
    resourceId?: string;
    userId?: string;
    collectionId?: string;
    categories?: boolean;
    popularResources?: boolean;
  }): Promise<void> {
    try {
      const promises: Promise<void>[] = [];

      if (options.resourceId) {
        promises.push(this.invalidateResourceCache(options.resourceId));
      }

      if (options.userId) {
        promises.push(this.invalidateProfileCache(options.userId));
      }

      if (options.collectionId) {
        promises.push(this.invalidateCollectionCache(options.collectionId));
      }

      if (options.categories) {
        promises.push(this.invalidateCategoriesCache());
      }

      if (options.popularResources) {
        promises.push(this.invalidatePopularResourcesCache());
      }

      await Promise.all(promises);
      logger.debug('Invalidation en cascade effectuée', options);
    } catch (error: any) {
      logger.error(`Erreur lors de l'invalidation en cascade: ${error.message}`);
    }
  }

  /**
   * Tag-based invalidation : associe des tags à des clés de cache pour invalidation groupée
   */
  async setWithTags<T>(key: string, value: T, tags: string[], options: CacheOptions = {}): Promise<void> {
    try {
      // Stocker la valeur
      await this.set(key, value, options);

      // Stocker les tags associés
      for (const tag of tags) {
        const tagKey = `cache:tag:${tag}`;
        await redis.sadd(tagKey, key);
        // Expirer le tag en même temps que la clé
        if (options.ttl) {
          await redis.expire(tagKey, options.ttl);
        }
      }
    } catch (error: any) {
      logger.error(`Erreur lors de l'enregistrement avec tags: ${error.message}`);
    }
  }

  /**
   * Invalide toutes les clés associées à un tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    try {
      const tagKey = `cache:tag:${tag}`;
      const keys = await redis.smembers(tagKey);

      if (keys.length > 0) {
        const fullKeys = keys.map((k) => `${this.CACHE_PREFIX}${k}`);
        await redis.del(...fullKeys);
        await redis.del(tagKey);
      }

      return keys.length;
    } catch (error: any) {
      logger.error(`Erreur lors de l'invalidation par tag: ${error.message}`);
      return 0;
    }
  }
}

export const cacheService = new CacheService();

