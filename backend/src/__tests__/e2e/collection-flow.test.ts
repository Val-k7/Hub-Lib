/**
 * Tests end-to-end pour le flux de collection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import collectionRoutes from '../../routes/collections.js';
import { authMiddleware } from '../../middleware/auth.js';
import { prisma } from '../../config/database.js';
import { cacheService } from '../../services/cacheService.js';

// Mock authMiddleware
vi.mock('../../middleware/auth.js', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-123', email: 'test@example.com' };
    next();
  },
}));

// Mock Prisma et services
vi.mock('../../config/database.js', () => ({
  prisma: {
    collection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    collectionResource: {
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    resource: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../services/cacheService.js', () => ({
  cacheService: {
    invalidateCollectionCache: vi.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/collections', collectionRoutes);

describe('Flux de collection E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait permettre de créer, ajouter des ressources, consulter et supprimer une collection', async () => {
    const userId = 'test-user-123';
    const collectionId = 'collection-e2e-123';
    const resourceId = 'resource-e2e-123';

    // 1. Créer une collection
    const newCollection = {
      name: 'Collection E2E Test',
      description: 'Description de test',
      isPublic: false,
    };

    const mockCreated = {
      id: collectionId,
      ...newCollection,
      userId,
      resourcesCount: 0,
      createdAt: new Date(),
    };

    vi.mocked(prisma.collection.create).mockResolvedValue(mockCreated as any);
    vi.mocked(cacheService.invalidateCollectionCache).mockResolvedValue();

    const createResponse = await request(app)
      .post('/api/collections')
      .send(newCollection);

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.id).toBe(collectionId);

    // 2. Récupérer la collection
    vi.mocked(prisma.collection.findUnique).mockResolvedValue(mockCreated as any);

    const getResponse = await request(app).get(`/api/collections/${collectionId}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.data.id).toBe(collectionId);

    // 3. Ajouter une ressource à la collection
    vi.mocked(prisma.resource.findUnique).mockResolvedValue({
      id: resourceId,
    } as any);
    vi.mocked(prisma.collectionResource.findMany).mockResolvedValue([]);
    vi.mocked(prisma.collectionResource.create).mockResolvedValue({
      id: 'cr-123',
      collectionId,
      resourceId,
    } as any);

    const addResourceResponse = await request(app)
      .post(`/api/collections/${collectionId}/resources`)
      .send({ resourceId });

    expect(addResourceResponse.status).toBe(200);

    // 4. Mettre à jour la collection
    const updates = {
      name: 'Collection E2E Test - Mis à jour',
    };

    const mockUpdated = {
      ...mockCreated,
      ...updates,
    };

    vi.mocked(prisma.collection.findUnique).mockResolvedValue(mockCreated as any);
    vi.mocked(prisma.collection.update).mockResolvedValue(mockUpdated as any);

    const updateResponse = await request(app)
      .put(`/api/collections/${collectionId}`)
      .send(updates);

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.name).toBe(updates.name);

    // 5. Supprimer la collection
    vi.mocked(prisma.collection.findUnique).mockResolvedValue(mockCreated as any);
    vi.mocked(prisma.collection.delete).mockResolvedValue({} as any);

    const deleteResponse = await request(app).delete(`/api/collections/${collectionId}`);

    expect(deleteResponse.status).toBe(204);
  });
});

