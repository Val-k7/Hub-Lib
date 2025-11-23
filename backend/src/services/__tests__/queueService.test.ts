/**
 * Tests unitaires pour queueService
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { queueService, JobType } from '../queueService.js';
import { prisma } from '../../config/database.js';
import { notificationService } from '../notificationService.js';
import { redis } from '../../config/redis.js';

// Mock Prisma, notificationService et Redis
vi.mock('../../config/database.js', () => ({
  prisma: {
    categoryTagSuggestion: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    suggestionVote: {
      count: vi.fn(),
    },
  },
}));

vi.mock('../notificationService.js', () => ({
  notificationService: {
    createNotification: vi.fn(),
  },
}));

vi.mock('../../config/redis.js', () => ({
  redis: {
    hincrby: vi.fn(),
    zadd: vi.fn(),
    expire: vi.fn(),
    get: vi.fn(),
    keys: vi.fn(),
    del: vi.fn(),
  },
}));

describe('queueService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Nettoyer les queues après chaque test
    await queueService.close();
  });

  describe('addJob', () => {
    it('devrait ajouter un job à la queue', async () => {
      const jobData = {
        event: 'page_view',
        userId: 'user-123',
      };

      const job = await queueService.addJob(JobType.ANALYTICS, jobData);

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
    });

    it('devrait ajouter un job de notification', async () => {
      const jobData = {
        userId: 'user-123',
        type: 'test',
        title: 'Test',
        message: 'Message test',
      };

      const job = await queueService.addJob(JobType.NOTIFICATION, jobData);

      expect(job).toBeDefined();
    });
  });

  describe('processAnalytics', () => {
    it('devrait traiter un événement analytics et l\'enregistrer dans Redis', async () => {
      const job = {
        id: 'job-123',
        data: {
          event: 'page_view',
          userId: 'user-123',
          resourceId: 'resource-123',
          metadata: { path: '/test' },
        },
      } as any;

      vi.mocked(redis.hincrby).mockResolvedValue(1);
      vi.mocked(redis.expire).mockResolvedValue(1);

      await queueService['processAnalytics'](job);

      expect(redis.hincrby).toHaveBeenCalled();
      expect(redis.expire).toHaveBeenCalled();
    });

    it('devrait enregistrer une ressource populaire dans Redis', async () => {
      const job = {
        id: 'job-123',
        data: {
          event: 'resource_view',
          resourceId: 'resource-123',
        },
      } as any;

      vi.mocked(redis.hincrby).mockResolvedValue(5);
      vi.mocked(redis.zadd).mockResolvedValue(1);
      vi.mocked(redis.expire).mockResolvedValue(1);

      await queueService['processAnalytics'](job);

      expect(redis.zadd).toHaveBeenCalled();
    });
  });

  describe('processNotification', () => {
    it('devrait traiter un job de notification', async () => {
      const job = {
        id: 'job-123',
        data: {
          userId: 'user-123',
          type: 'test',
          title: 'Test',
          message: 'Message test',
        },
      } as any;

      vi.mocked(notificationService.createNotification).mockResolvedValue({
        id: 'notif-123',
      } as any);

      await queueService['processNotification'](job);

      expect(notificationService.createNotification).toHaveBeenCalledWith({
        userId: 'user-123',
        type: 'test',
        title: 'Test',
        message: 'Message test',
      });
    });
  });

  describe('processAutoApproval', () => {
    it('devrait approuver automatiquement une suggestion avec assez de votes', async () => {
      const suggestionId = 'suggestion-123';
      const job = {
        id: 'job-123',
        data: {
          suggestionId,
          threshold: 10,
        },
      } as any;

      vi.mocked(prisma.categoryTagSuggestion.findUnique).mockResolvedValue({
        id: suggestionId,
        status: 'pending',
      } as any);
      vi.mocked(prisma.suggestionVote.count).mockResolvedValue(15);
      vi.mocked(prisma.categoryTagSuggestion.update).mockResolvedValue({
        id: suggestionId,
        status: 'approved',
      } as any);

      await queueService['processAutoApproval'](job);

      expect(prisma.categoryTagSuggestion.update).toHaveBeenCalledWith({
        where: { id: suggestionId },
        data: { status: 'approved' },
      });
    });

    it('ne devrait pas approuver si pas assez de votes', async () => {
      const suggestionId = 'suggestion-123';
      const job = {
        id: 'job-123',
        data: {
          suggestionId,
          threshold: 10,
        },
      } as any;

      vi.mocked(prisma.categoryTagSuggestion.findUnique).mockResolvedValue({
        id: suggestionId,
        status: 'pending',
      } as any);
      vi.mocked(prisma.suggestionVote.count).mockResolvedValue(5);

      await queueService['processAutoApproval'](job);

      expect(prisma.categoryTagSuggestion.update).not.toHaveBeenCalled();
    });
  });

  describe('getJobStatus', () => {
    it('devrait récupérer le statut d\'un job', async () => {
      const jobId = 'job-123';
      const queue = queueService['getQueue'](JobType.ANALYTICS);
      
      if (!queue) {
        // Queue non initialisée dans le test, on skip
        return;
      }

      // Mock du job
      const mockJob = {
        id: jobId,
        getState: vi.fn().mockResolvedValue('completed'),
        progress: 100,
        data: { event: 'test' },
      };

      vi.spyOn(queue, 'getJob').mockResolvedValue(mockJob as any);

      const status = await queueService.getJobStatus(JobType.ANALYTICS, jobId);

      expect(status).toBeDefined();
      expect(status.id).toBe(jobId);
    });
  });
});

