/**
 * Tests unitaires pour cacheService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cacheService } from '../cacheService.js';
import { redis } from '../../config/redis.js';

// Mock Redis
vi.mock('../../config/redis.js', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    keys: vi.fn(),
    expire: vi.fn(),
    exists: vi.fn(),
    incrby: vi.fn(),
    ttl: vi.fn(),
  },
}));

describe('cacheService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('get', () => {
    it('devrait récupérer une valeur depuis le cache', async () => {
      const key = 'test:key';
      const value = { data: 'test' };

      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(value));

      const result = await cacheService.get(key);

      expect(result).toEqual(value);
      expect(redis.get).toHaveBeenCalledWith(key);
    });

    it('devrait retourner null si la clé n\'existe pas', async () => {
      const key = 'nonexistent:key';

      vi.mocked(redis.get).mockResolvedValue(null);

      const result = await cacheService.get(key);

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('devrait stocker une valeur dans le cache', async () => {
      const key = 'test:key';
      const value = { data: 'test' };
      const ttl = 3600;

      vi.mocked(redis.setex).mockResolvedValue('OK');

      await cacheService.set(key, value, ttl);

      expect(redis.setex).toHaveBeenCalledWith(key, ttl, JSON.stringify(value));
    });

    it('devrait utiliser un TTL par défaut si non spécifié', async () => {
      const key = 'test:key';
      const value = { data: 'test' };

      vi.mocked(redis.setex).mockResolvedValue('OK');

      await cacheService.set(key, value);

      expect(redis.setex).toHaveBeenCalledWith(key, expect.any(Number), JSON.stringify(value));
    });
  });

  describe('delete', () => {
    it('devrait supprimer une clé du cache', async () => {
      const key = 'test:key';

      vi.mocked(redis.del).mockResolvedValue(1);

      await cacheService.delete(key);

      expect(redis.del).toHaveBeenCalledWith('cache:test:key');
    });
  });

  describe('has', () => {
    it('devrait vérifier si une clé existe', async () => {
      const key = 'test:key';

      vi.mocked(redis.exists).mockResolvedValue(1);

      const result = await cacheService.has(key);

      expect(result).toBe(true);
      expect(redis.exists).toHaveBeenCalledWith('cache:test:key');
    });

    it('devrait retourner false si la clé n\'existe pas', async () => {
      const key = 'test:key';

      vi.mocked(redis.exists).mockResolvedValue(0);

      const result = await cacheService.has(key);

      expect(result).toBe(false);
    });
  });

  describe('increment', () => {
    it('devrait incrémenter une valeur numérique', async () => {
      const key = 'test:counter';

      vi.mocked(redis.incrby).mockResolvedValue(5);

      const result = await cacheService.increment(key, 1);

      expect(result).toBe(5);
      expect(redis.incrby).toHaveBeenCalledWith('cache:test:counter', 1);
    });
  });

  describe('expire', () => {
    it('devrait définir l\'expiration d\'une clé', async () => {
      const key = 'test:key';
      const ttl = 3600;

      vi.mocked(redis.expire).mockResolvedValue(1);

      const result = await cacheService.expire(key, ttl);

      expect(result).toBe(true);
      expect(redis.expire).toHaveBeenCalledWith('cache:test:key', ttl);
    });
  });

  describe('invalidatePattern', () => {
    it('devrait invalider toutes les clés correspondant à un pattern', async () => {
      const pattern = 'test:*';
      const keys = ['cache:test:1', 'cache:test:2', 'cache:test:3'];

      vi.mocked(redis.keys).mockResolvedValue(keys);
      vi.mocked(redis.del).mockResolvedValue(3);

      const result = await cacheService.invalidatePattern(pattern);

      expect(result).toBe(3);
      expect(redis.keys).toHaveBeenCalled();
      expect(redis.del).toHaveBeenCalled();
    });
  });

  describe('getOrSet', () => {
    it('devrait récupérer depuis le cache si disponible', async () => {
      const key = 'test:key';
      const cachedValue = { data: 'cached' };

      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(cachedValue));

      const fetcher = vi.fn();

      const result = await cacheService.getOrSet(key, fetcher);

      expect(result).toEqual(cachedValue);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('devrait exécuter le fetcher si pas en cache', async () => {
      const key = 'test:key';
      const fetchedValue = { data: 'fetched' };

      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(redis.setex).mockResolvedValue('OK');

      const fetcher = vi.fn().mockResolvedValue(fetchedValue);

      const result = await cacheService.getOrSet(key, fetcher);

      expect(result).toEqual(fetchedValue);
      expect(fetcher).toHaveBeenCalled();
      expect(redis.setex).toHaveBeenCalled();
    });
  });

  describe('invalidateResourceCache', () => {
    it('devrait invalider les caches liés à une ressource', async () => {
      const resourceId = 'resource-123';

      vi.mocked(redis.del).mockResolvedValue(4);

      await cacheService.invalidateResourceCache(resourceId);

      expect(redis.del).toHaveBeenCalled();
    });
  });
});

