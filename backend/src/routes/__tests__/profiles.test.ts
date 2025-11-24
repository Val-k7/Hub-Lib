/**
 * Tests d'intégration pour les routes de profils
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import profileRoutes from '../profiles.js';
import { authMiddleware, optionalAuthMiddleware } from '../../middleware/auth.js';
import { prisma } from '../../config/database.js';

// Mock authMiddleware
vi.mock('../../middleware/auth.js', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-123', email: 'test@example.com' };
    next();
  },
  optionalAuthMiddleware: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-123', email: 'test@example.com' };
    next();
  },
}));

// Mock Prisma
vi.mock('../../config/database.js', () => ({
  prisma: {
    profile: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    resource: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/api/profiles', profileRoutes);

describe('GET /api/profiles/:userId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait récupérer un profil utilisateur', async () => {
    const userId = 'user-123';
    const mockProfile = {
      id: 'profile-123',
      userId,
      email: 'user@example.com',
      username: 'testuser',
      fullName: 'Test User',
    };

    vi.mocked(prisma.profile.findUnique).mockResolvedValue(mockProfile as any);

    const response = await request(app).get(`/api/profiles/${userId}`);

    expect(response.status).toBe(200);
    expect(response.body.data.userId).toBe(userId);
  });

  it('devrait retourner 404 si le profil n\'existe pas', async () => {
    vi.mocked(prisma.profile.findUnique).mockResolvedValue(null);

    const response = await request(app).get('/api/profiles/nonexistent');

    expect(response.status).toBe(404);
  });
});

describe('PUT /api/profiles/:userId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait mettre à jour un profil', async () => {
    const userId = 'test-user-123';
    const updates = {
      fullName: 'Nouveau Nom',
      bio: 'Nouvelle bio',
    };

    const mockUpdated = {
      id: 'profile-123',
      userId,
      ...updates,
    };

    vi.mocked(prisma.profile.findUnique).mockResolvedValue({
      id: 'profile-123',
      userId,
    } as any);
    vi.mocked(prisma.profile.update).mockResolvedValue(mockUpdated as any);

    const response = await request(app)
      .put(`/api/profiles/${userId}`)
      .send(updates);

    expect(response.status).toBe(200);
    expect(response.body.data.fullName).toBe(updates.fullName);
  });
});

describe('GET /api/profiles/:userId/resources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait récupérer les ressources d\'un utilisateur', async () => {
    const userId = 'user-123';
    const mockResources = [
      {
        id: 'resource-1',
        title: 'Ressource 1',
        userId,
      },
    ];

    vi.mocked(prisma.resource.findMany).mockResolvedValue(mockResources as any);

    const response = await request(app).get(`/api/profiles/${userId}/resources`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });
});


