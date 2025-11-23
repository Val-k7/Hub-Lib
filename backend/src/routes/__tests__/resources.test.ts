/**
 * Tests d'intégration pour les routes de ressources
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import resourceRoutes from '../resources.js';
import { authMiddleware } from '../../middleware/auth.js';
import { prisma } from '../../config/database.js';

// Mock authMiddleware
vi.mock('../../middleware/auth.js', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-123', email: 'test@example.com' };
    next();
  },
  optionalAuthMiddleware: (req: any, res: any, next: any) => next(),
}));

// Mock Prisma
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

const app = express();
app.use(express.json());
app.use('/api/resources', resourceRoutes);

describe('GET /api/resources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait récupérer la liste des ressources', async () => {
    const mockResources = [
      {
        id: 'resource-1',
        title: 'Ressource 1',
        description: 'Description 1',
        userId: 'user-1',
      },
      {
        id: 'resource-2',
        title: 'Ressource 2',
        description: 'Description 2',
        userId: 'user-2',
      },
    ];

    vi.mocked(prisma.resource.findMany).mockResolvedValue(mockResources as any);

    const response = await request(app).get('/api/resources');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('devrait filtrer les ressources par catégorie', async () => {
    vi.mocked(prisma.resource.findMany).mockResolvedValue([]);

    const response = await request(app)
      .get('/api/resources')
      .query({ category: 'development' });

    expect(response.status).toBe(200);
    expect(prisma.resource.findMany).toHaveBeenCalled();
  });
});

describe('GET /api/resources/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait récupérer une ressource par ID', async () => {
    const mockResource = {
      id: 'resource-123',
      title: 'Test Resource',
      description: 'Test Description',
      userId: 'user-123',
    };

    vi.mocked(prisma.resource.findUnique).mockResolvedValue(mockResource as any);

    const response = await request(app).get('/api/resources/resource-123');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.id).toBe('resource-123');
  });

  it('devrait retourner 404 si la ressource n\'existe pas', async () => {
    vi.mocked(prisma.resource.findUnique).mockResolvedValue(null);

    const response = await request(app).get('/api/resources/nonexistent');

    expect(response.status).toBe(404);
  });
});

describe('POST /api/resources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait créer une nouvelle ressource', async () => {
    const newResource = {
      title: 'Nouvelle Ressource',
      description: 'Description',
      category: 'development',
      tags: ['react', 'typescript'],
    };

    const mockCreated = {
      id: 'resource-new',
      ...newResource,
      userId: 'test-user-123',
      createdAt: new Date(),
    };

    vi.mocked(prisma.resource.create).mockResolvedValue(mockCreated as any);

    const response = await request(app)
      .post('/api/resources')
      .send(newResource);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data.title).toBe(newResource.title);
  });

  it('devrait rejeter une ressource sans titre', async () => {
    const invalidResource = {
      description: 'Description sans titre',
    };

    const response = await request(app)
      .post('/api/resources')
      .send(invalidResource);

    expect(response.status).toBe(400);
  });
});

describe('PUT /api/resources/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait mettre à jour une ressource', async () => {
    const resourceId = 'resource-123';
    const updates = {
      title: 'Titre mis à jour',
    };

    const mockUpdated = {
      id: resourceId,
      title: updates.title,
      userId: 'test-user-123',
    };

    vi.mocked(prisma.resource.findUnique).mockResolvedValue({
      id: resourceId,
      userId: 'test-user-123',
    } as any);
    vi.mocked(prisma.resource.update).mockResolvedValue(mockUpdated as any);

    const response = await request(app)
      .put(`/api/resources/${resourceId}`)
      .send(updates);

    expect(response.status).toBe(200);
    expect(response.body.data.title).toBe(updates.title);
  });
});

describe('DELETE /api/resources/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait supprimer une ressource', async () => {
    const resourceId = 'resource-123';

    vi.mocked(prisma.resource.findUnique).mockResolvedValue({
      id: resourceId,
      userId: 'test-user-123',
    } as any);
    vi.mocked(prisma.resource.delete).mockResolvedValue({} as any);

    const response = await request(app).delete(`/api/resources/${resourceId}`);

    expect(response.status).toBe(204);
    expect(prisma.resource.delete).toHaveBeenCalled();
  });
});

