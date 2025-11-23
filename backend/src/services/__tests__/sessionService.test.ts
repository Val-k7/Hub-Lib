/**
 * Tests unitaires pour sessionService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sessionService } from '../sessionService.js';
import { redis } from '../../config/redis.js';

// Mock Redis
vi.mock('../../config/redis.js', () => ({
  redis: {
    setex: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    exists: vi.fn(),
    sadd: vi.fn(),
    srem: vi.fn(),
    sismember: vi.fn(),
    smembers: vi.fn(),
    expire: vi.fn(),
    keys: vi.fn(),
    ttl: vi.fn(),
  },
}));

describe('sessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('devrait créer une session dans Redis', async () => {
      const userId = 'user-123';
      const refreshToken = 'refresh-token-123';

      vi.mocked(redis.setex).mockResolvedValue('OK');
      vi.mocked(redis.sadd).mockResolvedValue(1);
      vi.mocked(redis.expire).mockResolvedValue(1);

      await sessionService.createSession(userId, refreshToken);

      expect(redis.setex).toHaveBeenCalled();
      expect(redis.sadd).toHaveBeenCalled();
    });
  });

  describe('validateSession', () => {
    it('devrait valider une session existante', async () => {
      const userId = 'user-123';
      const refreshToken = 'refresh-token-123';

      vi.mocked(redis.get).mockResolvedValue(userId);
      vi.mocked(redis.sismember).mockResolvedValue(1);

      const result = await sessionService.validateSession(userId, refreshToken);

      expect(result).toBe(true);
    });

    it('devrait retourner false pour une session invalide', async () => {
      const userId = 'user-123';
      const refreshToken = 'invalid-token';

      vi.mocked(redis.get).mockResolvedValue(null);

      const result = await sessionService.validateSession(userId, refreshToken);

      expect(result).toBe(false);
    });
  });

  describe('deleteSession', () => {
    it('devrait supprimer une session de Redis', async () => {
      const userId = 'user-123';
      const refreshToken = 'refresh-token-123';

      vi.mocked(redis.del).mockResolvedValue(1);
      vi.mocked(redis.srem).mockResolvedValue(1);

      await sessionService.deleteSession(userId, refreshToken);

      expect(redis.del).toHaveBeenCalled();
      expect(redis.srem).toHaveBeenCalled();
    });
  });

  describe('sessionExists', () => {
    it('devrait vérifier si une session existe', async () => {
      const refreshToken = 'refresh-token-123';

      vi.mocked(redis.exists).mockResolvedValue(1);

      const result = await sessionService.sessionExists(refreshToken);

      expect(result).toBe(true);
    });

    it('devrait retourner false si la session n\'existe pas', async () => {
      const refreshToken = 'invalid-token';

      vi.mocked(redis.exists).mockResolvedValue(0);

      const result = await sessionService.sessionExists(refreshToken);

      expect(result).toBe(false);
    });
  });
});

