/**
 * Tests end-to-end pour le flux de création de ressource
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import resourceRoutes from '../../routes/resources.js';
import { authMiddleware } from '../../middleware/auth.js';
import { prisma } from '../../config/database.js';
import { cacheService } from '../../services/cacheService.js';
import { notificationService } from '../../services/notificationService.js';

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

// Mock Prisma et services
vi.mock('../../config/database.js', () => ({
  prisma: {
    resource: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../services/cacheService.js', () => ({
  cacheService: {
    invalidateResourceCache: vi.fn(),
    invalidateCascade: vi.fn(),
  },
}));

vi.mock('../../services/notificationService.js', () => ({
  notificationService: {
    publishResourceUpdate: vi.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/resources', resourceRoutes);

describe('Flux de ressource E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait permettre de créer, consulter, mettre à jour et supprimer une ressource', async () => {
    const userId = 'test-user-123';
    const resourceId = 'resource-e2e-123';

    // 1. Créer une ressource
    const newResource = {
      title: 'Ressource E2E Test',
      description: 'Description de test',
      category: 'development',
      tags: ['test', 'e2e'],
    };

    const mockCreated = {
      id: resourceId,
      ...newResource,
      userId,
      createdAt: new Date(),
    };

    vi.mocked(prisma.resource.create).mockResolvedValue(mockCreated as any);
    vi.mocked(cacheService.invalidateResourceCache).mockResolvedValue();
    vi.mocked(notificationService.publishResourceUpdate).mockResolvedValue();

    const createResponse = await request(app)
      .post('/api/resources')
      .send(newResource);

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.id).toBe(resourceId);

    // 2. Récupérer la ressource
    vi.mocked(prisma.resource.findUnique).mockResolvedValue(mockCreated as any);

    const getResponse = await request(app).get(`/api/resources/${resourceId}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.id).toBe(resourceId);

    // 3. Mettre à jour la ressource
    const updates = {
      title: 'Ressource E2E Test - Mis à jour',
    };

    const mockUpdated = {
      ...mockCreated,
      ...updates,
    };

    vi.mocked(prisma.resource.findUnique).mockResolvedValue(mockCreated as any);
    vi.mocked(prisma.resource.update).mockResolvedValue(mockUpdated as any);

    const updateResponse = await request(app)
      .put(`/api/resources/${resourceId}`)
      .send(updates);

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.title).toBe(updates.title);

    // 4. Supprimer la ressource
    vi.mocked(prisma.resource.findUnique).mockResolvedValue(mockCreated as any);
    vi.mocked(prisma.resource.delete).mockResolvedValue({} as any);

    const deleteResponse = await request(app).delete(`/api/resources/${resourceId}`);

    expect(deleteResponse.status).toBe(204);
  });
});


