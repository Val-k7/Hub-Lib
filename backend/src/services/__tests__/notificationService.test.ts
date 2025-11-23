/**
 * Tests unitaires pour notificationService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { notificationService } from '../notificationService.js';
import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';

// Mock Prisma et Redis
vi.mock('../../config/database.js', () => ({
  prisma: {
    notification: {
      create: vi.fn(),
      createMany: vi.fn(),
      findFirst: vi.fn(),
    },
    resource: {
      findUnique: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
    },
    group: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../config/redis.js', () => ({
  redis: {
    publish: vi.fn(),
  },
}));

describe('notificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    it('devrait créer une notification et la publier via Redis', async () => {
      const notificationData = {
        userId: 'user-123',
        type: 'test',
        title: 'Test Notification',
        message: 'Ceci est un test',
      };

      const mockNotification = {
        id: 'notif-123',
        ...notificationData,
        isRead: false,
        createdAt: new Date(),
      };

      vi.mocked(prisma.notification.create).mockResolvedValue(mockNotification as any);
      vi.mocked(redis.publish).mockResolvedValue(1);

      await notificationService.createNotification(notificationData);

      expect(prisma.notification.create).toHaveBeenCalled();
      expect(redis.publish).toHaveBeenCalled();
    });

    it('devrait créer une notification avec resourceId', async () => {
      const notificationData = {
        userId: 'user-123',
        type: 'resource_shared',
        title: 'Ressource partagée',
        message: 'Une ressource a été partagée',
        resourceId: 'resource-123',
      };

      const mockNotification = {
        id: 'notif-123',
        ...notificationData,
        isRead: false,
        createdAt: new Date(),
      };

      vi.mocked(prisma.notification.create).mockResolvedValue(mockNotification as any);
      vi.mocked(redis.publish).mockResolvedValue(1);

      await notificationService.createNotification(notificationData);

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          resourceId: 'resource-123',
        }),
      });
    });
  });

  describe('publishResourceUpdate', () => {
    it('devrait publier une mise à jour de ressource via Redis', async () => {
      const resourceId = 'resource-123';
      const update = { title: 'Nouveau titre' };

      vi.mocked(redis.publish).mockResolvedValue(1);

      await notificationService.publishResourceUpdate(resourceId, update);

      expect(redis.publish).toHaveBeenCalledWith(
        `resource:updates:${resourceId}`,
        expect.stringContaining(resourceId)
      );
    });
  });

  describe('publishSuggestionVote', () => {
    it('devrait publier un vote sur suggestion via Redis', async () => {
      const suggestionId = 'suggestion-123';
      const voteData = {
        userId: 'user-123',
        voteType: 'upvote' as const,
        totalUpvotes: 5,
        totalDownvotes: 2,
      };

      vi.mocked(redis.publish).mockResolvedValue(1);

      await notificationService.publishSuggestionVote(suggestionId, voteData);

      expect(redis.publish).toHaveBeenCalledWith(
        'suggestions:votes',
        expect.stringContaining(suggestionId)
      );
    });
  });
});

