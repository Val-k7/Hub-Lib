/**
 * Tests d'intégration pour les routes de commentaires
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import commentRoutes from '../comments.js';
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
    resourceComment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    resource: {
      findUnique: vi.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/api/comments', commentRoutes);

describe('POST /api/comments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait créer un nouveau commentaire', async () => {
    const newComment = {
      resourceId: 'resource-123',
      content: 'Ceci est un commentaire de test',
    };

    const mockCreated = {
      id: 'comment-123',
      ...newComment,
      userId: 'test-user-123',
      createdAt: new Date(),
    };

    vi.mocked(prisma.resource.findUnique).mockResolvedValue({
      id: 'resource-123',
    } as any);
    vi.mocked(prisma.resourceComment.create).mockResolvedValue(mockCreated as any);

    const response = await request(app)
      .post('/api/comments')
      .send(newComment);

    expect(response.status).toBe(201);
    expect(response.body.data.content).toBe(newComment.content);
  });
});

describe('GET /api/comments/resource/:resourceId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait récupérer les commentaires d\'une ressource', async () => {
    const resourceId = 'resource-123';
    const mockComments = [
      {
        id: 'comment-1',
        resourceId,
        content: 'Commentaire 1',
        userId: 'user-1',
      },
    ];

    vi.mocked(prisma.resourceComment.findMany).mockResolvedValue(mockComments as any);

    const response = await request(app).get(`/api/comments/resource/${resourceId}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });
});

describe('PUT /api/comments/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait mettre à jour un commentaire', async () => {
    const commentId = 'comment-123';
    const updates = {
      content: 'Commentaire mis à jour',
    };

    const mockComment = {
      id: commentId,
      userId: 'test-user-123',
      content: 'Ancien contenu',
    };

    vi.mocked(prisma.resourceComment.findUnique).mockResolvedValue(mockComment as any);
    vi.mocked(prisma.resourceComment.update).mockResolvedValue({
      ...mockComment,
      ...updates,
    } as any);

    const response = await request(app)
      .put(`/api/comments/${commentId}`)
      .send(updates);

    expect(response.status).toBe(200);
    expect(response.body.data.content).toBe(updates.content);
  });
});

describe('DELETE /api/comments/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait supprimer un commentaire', async () => {
    const commentId = 'comment-123';

    vi.mocked(prisma.resourceComment.findUnique).mockResolvedValue({
      id: commentId,
      userId: 'test-user-123',
    } as any);
    vi.mocked(prisma.resourceComment.delete).mockResolvedValue({} as any);

    const response = await request(app).delete(`/api/comments/${commentId}`);

    expect(response.status).toBe(204);
  });
});

