/**
 * Tests d'intégration pour les routes analytics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import analyticsRoutes from '../analytics.js';
import { optionalAuthMiddleware } from '../../middleware/auth.js';
import { queueService } from '../../services/queueService.js';
import { redis } from '../../config/redis.js';

// Mock authMiddleware
vi.mock('../../middleware/auth.js', () => ({
  optionalAuthMiddleware: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-123', email: 'test@example.com' };
    next();
  },
}));

// Mock queueService et Redis
vi.mock('../../services/queueService.js', () => ({
  queueService: {
    addJob: vi.fn(),
  },
  JobType: {
    ANALYTICS: 'analytics',
  },
}));

vi.mock('../../config/redis.js', () => ({
  redis: {
    get: vi.fn(),
    keys: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/analytics', analyticsRoutes);

describe('POST /api/analytics/track', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait enregistrer un événement analytics', async () => {
    const eventData = {
      event: 'page_view',
      metadata: { path: '/test' },
    };

    vi.mocked(queueService.addJob).mockResolvedValue({ id: 'job-123' } as any);

    const response = await request(app)
      .post('/api/analytics/track')
      .send(eventData);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(queueService.addJob).toHaveBeenCalled();
  });

  it('devrait rejeter une requête sans événement', async () => {
    const response = await request(app)
      .post('/api/analytics/track')
      .send({});

    expect(response.status).toBe(400);
  });
});

describe('GET /api/analytics/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait récupérer les statistiques analytics', async () => {
    vi.mocked(redis.get).mockResolvedValue('10');

    const response = await request(app).get('/api/analytics/stats');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('totalEvents');
  });
});

describe('GET /api/analytics/popular-resources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait récupérer les ressources populaires', async () => {
    vi.mocked(redis.keys).mockResolvedValue([]);

    const response = await request(app).get('/api/analytics/popular-resources?limit=10');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});

