/**
 * Tests d'intégration pour les routes de migration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import migrationRoutes from '../migration.js';
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
    $transaction: vi.fn(),
    profile: {
      createMany: vi.fn(),
    },
    resource: {
      createMany: vi.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/api/migration', migrationRoutes);

describe('POST /api/migration/validate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait valider les données d\'import', async () => {
    const importData = {
      metadata: {
        exportDate: new Date().toISOString(),
      },
      tables: {
        profiles: [
          {
            id: 'user-1',
            email: 'test@example.com',
            username: 'testuser',
          },
        ],
        resources: [
          {
            id: 'resource-1',
            title: 'Test Resource',
            userId: 'user-1',
          },
        ],
      },
    };

    const response = await request(app)
      .post('/api/migration/validate')
      .send(importData);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('valid');
  });

  it('devrait détecter les erreurs de validation', async () => {
    const invalidData = {
      metadata: {
        exportDate: new Date().toISOString(),
      },
      tables: {
        profiles: [
          {
            id: 'user-1',
            // Email manquant
          },
        ],
      },
    };

    const response = await request(app)
      .post('/api/migration/validate')
      .send(invalidData);

    expect(response.status).toBe(200);
    expect(response.body.errors.length).toBeGreaterThan(0);
  });
});

describe('POST /api/migration/import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait importer les données valides', async () => {
    const importData = {
      metadata: {
        exportDate: new Date().toISOString(),
      },
      tables: {
        profiles: [
          {
            id: 'user-1',
            email: 'test@example.com',
            username: 'testuser',
          },
        ],
      },
    };

    vi.mocked(prisma.$transaction).mockImplementation(async (callback: any) => {
      return await callback({
        profile: {
          createMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      } as any);
    });

    const response = await request(app)
      .post('/api/migration/import')
      .send(importData);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success');
  });
});


