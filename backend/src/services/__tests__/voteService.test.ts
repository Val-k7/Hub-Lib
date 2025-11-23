/**
 * Tests unitaires pour voteService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { voteService } from '../voteService.js';
import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { notificationService } from '../notificationService.js';

// Mock Prisma, Redis et notificationService
vi.mock('../../config/database.js', () => ({
  prisma: {
    categoryTagSuggestion: {
      findUnique: vi.fn(),
    },
    suggestionVote: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('../../config/redis.js', () => ({
  redis: {
    setex: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    zrevrange: vi.fn(),
    zadd: vi.fn(),
    zremrangebyrank: vi.fn(),
  },
}));

vi.mock('../notificationService.js', () => ({
  notificationService: {
    publishSuggestionVote: vi.fn(),
  },
}));

describe('voteService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('voteOnSuggestion', () => {
    it('devrait créer un nouveau vote', async () => {
      const suggestionId = 'suggestion-123';
      const userId = 'user-123';
      const voteType = 'upvote' as const;

      const mockSuggestion = {
        id: suggestionId,
        status: 'pending',
      };

      vi.mocked(prisma.categoryTagSuggestion.findUnique).mockResolvedValue(mockSuggestion as any);
      vi.mocked(prisma.suggestionVote.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.suggestionVote.create).mockResolvedValue({
        id: 'vote-123',
        suggestionId,
        userId,
        voteType,
      } as any);
      vi.mocked(prisma.suggestionVote.count).mockResolvedValueOnce(5).mockResolvedValueOnce(2);
      vi.mocked(redis.setex).mockResolvedValue('OK');
      vi.mocked(notificationService.publishSuggestionVote).mockResolvedValue();

      const result = await voteService.voteOnSuggestion(suggestionId, userId, voteType);

      expect(result.success).toBe(true);
      expect(result.totalUpvotes).toBe(5);
      expect(result.totalDownvotes).toBe(2);
      expect(result.userVote).toBe('upvote');
      expect(prisma.suggestionVote.create).toHaveBeenCalled();
      expect(notificationService.publishSuggestionVote).toHaveBeenCalled();
    });

    it('devrait annuler un vote si l\'utilisateur vote de la même manière', async () => {
      const suggestionId = 'suggestion-123';
      const userId = 'user-123';
      const voteType = 'upvote' as const;

      const mockSuggestion = {
        id: suggestionId,
        status: 'pending',
      };

      const existingVote = {
        id: 'vote-123',
        suggestionId,
        userId,
        voteType: 'upvote',
      };

      vi.mocked(prisma.categoryTagSuggestion.findUnique).mockResolvedValue(mockSuggestion as any);
      vi.mocked(prisma.suggestionVote.findUnique).mockResolvedValue(existingVote as any);
      vi.mocked(prisma.suggestionVote.delete).mockResolvedValue(existingVote as any);
      vi.mocked(prisma.suggestionVote.count).mockResolvedValueOnce(4).mockResolvedValueOnce(2);
      vi.mocked(redis.setex).mockResolvedValue('OK');
      vi.mocked(notificationService.publishSuggestionVote).mockResolvedValue();

      const result = await voteService.voteOnSuggestion(suggestionId, userId, voteType);

      expect(result.success).toBe(true);
      expect(result.userVote).toBeNull();
      expect(prisma.suggestionVote.delete).toHaveBeenCalled();
    });

    it('devrait changer un vote existant', async () => {
      const suggestionId = 'suggestion-123';
      const userId = 'user-123';
      const voteType = 'downvote' as const;

      const mockSuggestion = {
        id: suggestionId,
        status: 'pending',
      };

      const existingVote = {
        id: 'vote-123',
        suggestionId,
        userId,
        voteType: 'upvote',
      };

      vi.mocked(prisma.categoryTagSuggestion.findUnique).mockResolvedValue(mockSuggestion as any);
      vi.mocked(prisma.suggestionVote.findUnique).mockResolvedValue(existingVote as any);
      vi.mocked(prisma.suggestionVote.update).mockResolvedValue({
        ...existingVote,
        voteType: 'downvote',
      } as any);
      vi.mocked(prisma.suggestionVote.count).mockResolvedValueOnce(4).mockResolvedValueOnce(3);
      vi.mocked(redis.setex).mockResolvedValue('OK');
      vi.mocked(notificationService.publishSuggestionVote).mockResolvedValue();

      const result = await voteService.voteOnSuggestion(suggestionId, userId, voteType);

      expect(result.success).toBe(true);
      expect(result.userVote).toBe('downvote');
      expect(prisma.suggestionVote.update).toHaveBeenCalled();
    });
  });

  describe('getSuggestionVotes', () => {
    it('devrait récupérer les votes depuis le cache si disponible', async () => {
      const suggestionId = 'suggestion-123';
      const cachedData = { totalUpvotes: 5, totalDownvotes: 2 };

      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(cachedData));

      const result = await voteService.getSuggestionVotes(suggestionId);

      expect(result).toEqual(cachedData);
      expect(redis.get).toHaveBeenCalled();
      expect(prisma.suggestionVote.count).not.toHaveBeenCalled();
    });

    it('devrait récupérer les votes depuis la DB si pas en cache', async () => {
      const suggestionId = 'suggestion-123';

      vi.mocked(redis.get).mockResolvedValue(null);
      vi.mocked(prisma.suggestionVote.count).mockResolvedValueOnce(5).mockResolvedValueOnce(2);
      vi.mocked(redis.setex).mockResolvedValue('OK');

      const result = await voteService.getSuggestionVotes(suggestionId);

      expect(result).toEqual({ totalUpvotes: 5, totalDownvotes: 2 });
      expect(prisma.suggestionVote.count).toHaveBeenCalledTimes(2);
      expect(redis.setex).toHaveBeenCalled();
    });
  });
});

