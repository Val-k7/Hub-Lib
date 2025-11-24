/**
 * Tests d'intégration pour les routes de collections
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import collectionRoutes from '../collections.js';
import { authMiddleware } from '../../middleware/auth.js';
import { prisma } from '../../config/database.js';

// Mock authMiddleware
vi.mock('../../middleware/auth.js', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-123', email: 'test@example.com' };
    next();
  },
}));

// Mock Prisma
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
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    resource: {
      findMany: vi.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/api/collections', collectionRoutes);

describe('GET /api/collections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait récupérer les collections de l\'utilisateur', async () => {
    const mockCollections = [
      {
        id: 'collection-1',
        name: 'Ma Collection',
        userId: 'test-user-123',
      },
    ];

    vi.mocked(prisma.collection.findMany).mockResolvedValue(mockCollections as any);

    const response = await request(app).get('/api/collections');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});

describe('POST /api/collections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait créer une nouvelle collection', async () => {
    const newCollection = {
      name: 'Nouvelle Collection',
      description: 'Description',
      isPublic: false,
    };

    const mockCreated = {
      id: 'collection-new',
      ...newCollection,
      userId: 'test-user-123',
      resourcesCount: 0,
      createdAt: new Date(),
    };

    vi.mocked(prisma.collection.create).mockResolvedValue(mockCreated as any);

    const response = await request(app)
      .post('/api/collections')
      .send(newCollection);

    expect(response.status).toBe(201);
    expect(response.body.data.name).toBe(newCollection.name);
  });
});

describe('POST /api/collections/:id/resources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait ajouter une ressource à une collection', async () => {
    const collectionId = 'collection-123';
    const resourceId = 'resource-123';

    vi.mocked(prisma.collection.findUnique).mockResolvedValue({
      id: collectionId,
      userId: 'test-user-123',
    } as any);
    vi.mocked(prisma.collectionResource.findMany).mockResolvedValue([]);
    vi.mocked(prisma.collectionResource.create).mockResolvedValue({
      id: 'cr-123',
      collectionId,
      resourceId,
    } as any);

    const response = await request(app)
      .post(`/api/collections/${collectionId}/resources`)
      .send({ resourceId });

    expect(response.status).toBe(200);
    expect(prisma.collectionResource.create).toHaveBeenCalled();
  });
});


