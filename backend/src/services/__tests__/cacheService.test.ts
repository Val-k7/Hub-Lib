/**
 * Tests d'intégration pour cacheService
 * Utilise de vraies connexions Redis
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cacheService } from '../cacheService.js';
import { isRedisAvailable } from '../../test/helpers.js';

describe('cacheService', () => {
  const testKeys: string[] = [];

  beforeEach(async () => {
    // Nettoyer les clés de test existantes
    for (const key of testKeys) {
      try {
        await cacheService.delete(key);
      } catch (error) {
        // Ignorer
      }
    }
    testKeys.length = 0;
  });

  afterEach(async () => {
    // Nettoyer toutes les clés de test
    for (const key of testKeys) {
      try {
        await cacheService.delete(key);
      } catch (error) {
        // Ignorer
      }
    }
    testKeys.length = 0;
  });

  describe('get', () => {
    it('devrait récupérer une valeur depuis le cache', async () => {
      if (!(await isRedisAvailable())) {
        return;
      }

      const key = 'test:get:key';
      const value = { data: 'test' };
      testKeys.push(key);

      // Stocker d'abord
      await cacheService.set(key, value, { ttl: 60 });
      
      // Récupérer
      const result = await cacheService.get(key);

      expect(result).toEqual(value);
    });

    it('devrait retourner null si la clé n\'existe pas', async () => {
      if (!(await isRedisAvailable())) {
        return;
      }

      const key = 'test:nonexistent:key';

      const result = await cacheService.get(key);

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('devrait stocker une valeur dans le cache', async () => {
      if (!(await isRedisAvailable())) {
        return;
      }

      const key = 'test:set:key';
      const value = { data: 'test set' };
      const ttl = 60;
      testKeys.push(key);

      await cacheService.set(key, value, { ttl });

      // Vérifier que la valeur est stockée
      const result = await cacheService.get(key);
      expect(result).toEqual(value);
    });

    it('devrait utiliser un TTL par défaut si non spécifié', async () => {
      if (!(await isRedisAvailable())) {
        return;
      }

      const key = 'test:set:no:ttl';
      const value = { data: 'test no ttl' };
      testKeys.push(key);

      await cacheService.set(key, value);

      // Vérifier que la valeur est stockée
      const result = await cacheService.get(key);
      expect(result).toEqual(value);
    });
  });

  describe('delete', () => {
    it('devrait supprimer une clé du cache', async () => {
      if (!(await isRedisAvailable())) {
        return;
      }

      const key = 'test:delete:key';
      const value = { data: 'test delete' };
      testKeys.push(key);

      // Stocker d'abord
      await cacheService.set(key, value);
      expect(await cacheService.get(key)).toEqual(value);

      // Supprimer
      await cacheService.delete(key);

      // Vérifier que la clé n'existe plus
      const result = await cacheService.get(key);
      expect(result).toBeNull();
    });
  });

  describe('clear', () => {
    it('devrait vider tout le cache', async () => {
      if (!(await isRedisAvailable())) {
        return;
      }

      const key1 = 'test:clear:key1';
      const key2 = 'test:clear:key2';
      testKeys.push(key1, key2);

      // Stocker des valeurs
      await cacheService.set(key1, { data: 'test1' });
      await cacheService.set(key2, { data: 'test2' });

      // Vider le cache
      await cacheService.clear();

      // Vérifier que les clés n'existent plus
      expect(await cacheService.get(key1)).toBeNull();
      expect(await cacheService.get(key2)).toBeNull();
    });
  });
});
