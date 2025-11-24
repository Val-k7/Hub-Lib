/**
 * Tests d'intégration pour les routes admin
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import adminRoutes from '../admin.js';
import { authMiddleware, requireRole } from '../../middleware/auth.js';
import { prisma } from '../../config/database.js';

// Mock authMiddleware avec rôle admin
vi.mock('../../middleware/auth.js', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { userId: 'admin-user-123', email: 'admin@example.com', role: 'admin' };
    next();
  },
  requireRole: () => (req: any, res: any, next: any) => {
    if (req.user?.role === 'admin') {
      next();
    } else {
      res.status(403).json({ error: 'Accès refusé' });
    }
  },
}));

// Mock Prisma
vi.mock('../../config/database.js', () => ({
  prisma: {
    profile: {
      count: vi.fn(),
    },
    resource: {
      count: vi.fn(),
    },
    collection: {
      count: vi.fn(),
    },
    notification: {
      count: vi.fn(),
    },
    categoryTagSuggestion: {
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    adminConfig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait récupérer les statistiques admin', async () => {
    vi.mocked(prisma.profile.count).mockResolvedValue(100);
    vi.mocked(prisma.resource.count).mockResolvedValue(500);
    vi.mocked(prisma.collection.count).mockResolvedValue(50);
    vi.mocked(prisma.notification.count).mockResolvedValue(200);

    const response = await request(app).get('/api/admin/stats');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('users');
    expect(response.body).toHaveProperty('resources');
    expect(response.body).toHaveProperty('collections');
  });
});

describe('GET /api/admin/suggestions/pending', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait récupérer les suggestions en attente', async () => {
    const mockSuggestions = [
      {
        id: 'suggestion-1',
        name: 'Nouvelle catégorie',
        status: 'pending',
      },
    ];

    vi.mocked(prisma.categoryTagSuggestion.findMany).mockResolvedValue(mockSuggestions as any);

    const response = await request(app).get('/api/admin/suggestions/pending');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });
});

describe('PUT /api/admin/suggestions/:id/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait approuver une suggestion', async () => {
    const suggestionId = 'suggestion-123';

    vi.mocked(prisma.categoryTagSuggestion.findUnique).mockResolvedValue({
      id: suggestionId,
      status: 'pending',
    } as any);
    vi.mocked(prisma.categoryTagSuggestion.update).mockResolvedValue({
      id: suggestionId,
      status: 'approved',
    } as any);

    const response = await request(app).put(`/api/admin/suggestions/${suggestionId}/approve`);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('approved');
  });
});


