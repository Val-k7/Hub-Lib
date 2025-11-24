/**
 * Tests d'intégration pour les routes de groupes
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import groupRoutes from '../groups.js';
import { authMiddleware } from '../../middleware/auth.js';
import { prisma } from '../../config/database.js';

// Mock authMiddleware
vi.mock('../../middleware/auth.js', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-123', email: 'test@example.com' };
    next();
  },
  requireRole: () => (req: any, res: any, next: any) => next(),
}));

// Mock Prisma
vi.mock('../../config/database.js', () => ({
  prisma: {
    group: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    groupMember: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    profile: {
      findUnique: vi.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/api/groups', groupRoutes);

describe('GET /api/groups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait récupérer les groupes de l\'utilisateur', async () => {
    const mockGroups = [
      {
        id: 'group-1',
        name: 'Mon Groupe',
        ownerId: 'test-user-123',
      },
    ];

    vi.mocked(prisma.group.findMany).mockResolvedValue(mockGroups as any);

    const response = await request(app).get('/api/groups');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });
});

describe('POST /api/groups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait créer un nouveau groupe', async () => {
    const newGroup = {
      name: 'Nouveau Groupe',
      description: 'Description du groupe',
    };

    const mockCreated = {
      id: 'group-new',
      ...newGroup,
      ownerId: 'test-user-123',
      createdAt: new Date(),
    };

    vi.mocked(prisma.group.create).mockResolvedValue(mockCreated as any);

    const response = await request(app)
      .post('/api/groups')
      .send(newGroup);

    expect(response.status).toBe(201);
    expect(response.body.data.name).toBe(newGroup.name);
  });
});

describe('POST /api/groups/:id/members', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait ajouter un membre à un groupe', async () => {
    const groupId = 'group-123';
    const memberData = {
      userId: 'user-456',
      role: 'member',
    };

    vi.mocked(prisma.group.findUnique).mockResolvedValue({
      id: groupId,
      ownerId: 'test-user-123',
    } as any);
    vi.mocked(prisma.groupMember.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.groupMember.create).mockResolvedValue({
      id: 'member-123',
      groupId,
      ...memberData,
    } as any);

    const response = await request(app)
      .post(`/api/groups/${groupId}/members`)
      .send(memberData);

    expect(response.status).toBe(200);
    expect(prisma.groupMember.create).toHaveBeenCalled();
  });
});


