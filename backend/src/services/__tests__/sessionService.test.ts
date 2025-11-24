/**
 * Tests d'intégration pour sessionService
 * Utilise de vraies connexions Redis
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { sessionService } from '../sessionService.js';
import { v4 as uuidv4 } from 'uuid';
import { isRedisAvailable } from '../../test/helpers.js';

describe('sessionService', () => {
  const testSessions: Array<{ userId: string; refreshToken: string }> = [];

  beforeEach(() => {
    testSessions.length = 0;
  });

  afterEach(async () => {
    // Nettoyer toutes les sessions de test
    for (const session of testSessions) {
      try {
        await sessionService.deleteSession(session.userId, session.refreshToken);
      } catch (error) {
        // Ignorer les erreurs
      }
    }
    testSessions.length = 0;
  });

  describe('createSession', () => {
    it('devrait créer une session dans Redis', async () => {
      if (!(await isRedisAvailable())) {
        return;
      }

      const userId = `test-user-${uuidv4()}`;
      const refreshToken = `refresh-token-${uuidv4()}`;
      testSessions.push({ userId, refreshToken });

      await sessionService.createSession(userId, refreshToken);

      // Vérifier que la session existe
      const isValid = await sessionService.validateSession(userId, refreshToken);
      expect(isValid).toBe(true);
    });
  });

  describe('validateSession', () => {
    it('devrait valider une session existante', async () => {
      if (!(await isRedisAvailable())) {
        return;
      }

      const userId = `test-user-${uuidv4()}`;
      const refreshToken = `refresh-token-${uuidv4()}`;
      testSessions.push({ userId, refreshToken });

      // Créer la session
      await sessionService.createSession(userId, refreshToken);

      // Valider
      const result = await sessionService.validateSession(userId, refreshToken);
      expect(result).toBe(true);
    });

    it('devrait retourner false pour une session invalide', async () => {
      if (!(await isRedisAvailable())) {
        return;
      }

      const userId = `test-user-${uuidv4()}`;
      const refreshToken = 'invalid-token';

      const result = await sessionService.validateSession(userId, refreshToken);
      expect(result).toBe(false);
    });
  });

  describe('deleteSession', () => {
    it('devrait supprimer une session de Redis', async () => {
      if (!(await isRedisAvailable())) {
        return;
      }

      const userId = `test-user-${uuidv4()}`;
      const refreshToken = `refresh-token-${uuidv4()}`;

      // Créer la session
      await sessionService.createSession(userId, refreshToken);
      
      // Vérifier qu'elle existe
      expect(await sessionService.validateSession(userId, refreshToken)).toBe(true);

      // Supprimer
      await sessionService.deleteSession(userId, refreshToken);

      // Vérifier qu'elle n'existe plus
      const result = await sessionService.validateSession(userId, refreshToken);
      expect(result).toBe(false);
    });
  });

  describe('getUserSessions', () => {
    it('devrait récupérer toutes les sessions d\'un utilisateur', async () => {
      if (!(await isRedisAvailable())) {
        return;
      }

      const userId = `test-user-${uuidv4()}`;
      const refreshToken1 = `refresh-token-${uuidv4()}`;
      const refreshToken2 = `refresh-token-${uuidv4()}`;
      testSessions.push({ userId, refreshToken: refreshToken1 });
      testSessions.push({ userId, refreshToken: refreshToken2 });

      // Créer plusieurs sessions
      await sessionService.createSession(userId, refreshToken1);
      await sessionService.createSession(userId, refreshToken2);

      // Récupérer les sessions
      const sessions = await sessionService.getUserSessions(userId);

      expect(Array.isArray(sessions)).toBe(true);
      expect(sessions.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('deleteAllUserSessions', () => {
    it('devrait supprimer toutes les sessions d\'un utilisateur', async () => {
      if (!(await isRedisAvailable())) {
        return;
      }

      const userId = `test-user-${uuidv4()}`;
      const refreshToken1 = `refresh-token-${uuidv4()}`;
      const refreshToken2 = `refresh-token-${uuidv4()}`;

      // Créer plusieurs sessions
      await sessionService.createSession(userId, refreshToken1);
      await sessionService.createSession(userId, refreshToken2);

      // Vérifier qu'elles existent
      expect(await sessionService.validateSession(userId, refreshToken1)).toBe(true);
      expect(await sessionService.validateSession(userId, refreshToken2)).toBe(true);

      // Supprimer toutes les sessions
      await sessionService.deleteAllUserSessions(userId);

      // Vérifier qu'elles n'existent plus
      expect(await sessionService.validateSession(userId, refreshToken1)).toBe(false);
      expect(await sessionService.validateSession(userId, refreshToken2)).toBe(false);
    });
  });
});
