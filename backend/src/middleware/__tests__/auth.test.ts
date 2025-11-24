/**
 * Tests d'intégration pour le middleware d'authentification
 * Utilise de vraies connexions et tokens JWT
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authMiddleware, optionalAuthMiddleware, requireOwnership, requireRole } from '../auth.js';
import { createTestUser, deleteTestUser, type TestUser, isDatabaseAvailable } from '../../test/helpers.js';
import { prisma } from '../../config/database.js';
import { authService } from '../../services/authService.js';

describe('authMiddleware', () => {
  let testUser: TestUser;

  beforeEach(async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }
    testUser = await createTestUser();
  });

  afterEach(async () => {
    if (testUser?.userId) {
      await deleteTestUser(testUser.userId);
    }
  });

  it('devrait accepter une requête avec un token valide', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const req = {
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
    } as Partial<Request>;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await authMiddleware(req as Request, res, next);

    expect(req.user).toBeDefined();
    expect(req.user?.userId).toBe(testUser.userId);
    expect(req.user?.email).toBe(testUser.email);
    expect(next).toHaveBeenCalled();
  });

  it('devrait rejeter une requête sans token', async () => {
    const req = {
      headers: {},
    } as Partial<Request>;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as Partial<Response>;

    const next = vi.fn() as NextFunction;

    await authMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('devrait rejeter une requête avec un token invalide', async () => {
    const req = {
      headers: {
        authorization: 'Bearer invalid-token',
      },
    } as Partial<Request>;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as Partial<Response>;

    const next = vi.fn() as NextFunction;

    await authMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('optionalAuthMiddleware', () => {
  it('devrait accepter une requête sans token', async () => {
    const req = {
      headers: {},
    } as Partial<Request>;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await optionalAuthMiddleware(req as Request, res, next);

    expect(next).toHaveBeenCalled();
    // req.user peut être undefined
  });

  it('devrait accepter une requête avec un token valide', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testUser = await createTestUser();

    const req = {
      headers: {
        authorization: `Bearer ${testUser.accessToken}`,
      },
    } as Partial<Request>;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await optionalAuthMiddleware(req as Request, res, next);

    expect(req.user).toBeDefined();
    expect(next).toHaveBeenCalled();

    await deleteTestUser(testUser.userId);
  });
});

describe('requireOwnership', () => {
  let testUser: TestUser;
  let testResource: { id: string; userId: string };

  beforeEach(async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }
    testUser = await createTestUser();

    testResource = await prisma.resource.create({
      data: {
        userId: testUser.userId,
        title: 'Test Resource',
        description: 'Description',
        visibility: 'public',
        resourceType: 'file_upload',
      },
    });
  });

  afterEach(async () => {
    if (testResource?.id) {
      await prisma.resource.delete({ where: { id: testResource.id } });
    }
    if (testUser?.userId) {
      await deleteTestUser(testUser.userId);
    }
  });

  it('devrait accepter si l\'utilisateur est propriétaire', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const req = {
      user: { userId: testUser.userId },
      params: { id: testResource.id },
    } as Partial<Request>;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    const middleware = requireOwnership('resource');
    await middleware(req as Request, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('devrait rejeter si l\'utilisateur n\'est pas propriétaire', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const otherUser = await createTestUser();

    const req = {
      user: { userId: otherUser.userId },
      params: { id: testResource.id },
    } as Partial<Request>;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as Partial<Response>;

    const next = vi.fn() as NextFunction;

    const middleware = requireOwnership('resource');
    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();

    await deleteTestUser(otherUser.userId);
  });
});

describe('requireRole', () => {
  let adminUser: TestUser;
  let regularUser: TestUser;

  beforeEach(async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }
    adminUser = await createTestUser({ role: 'admin' });
    regularUser = await createTestUser({ role: 'user' });
  });

  afterEach(async () => {
    if (adminUser?.userId) {
      await deleteTestUser(adminUser.userId);
    }
    if (regularUser?.userId) {
      await deleteTestUser(regularUser.userId);
    }
  });

  it('devrait accepter si l\'utilisateur a le rôle requis', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const req = {
      user: { userId: adminUser.userId, role: 'admin' },
    } as Partial<Request>;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    const middleware = requireRole('admin');
    await middleware(req as Request, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('devrait rejeter si l\'utilisateur n\'a pas le rôle requis', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const req = {
      user: { userId: regularUser.userId, role: 'user' },
    } as Partial<Request>;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as Partial<Response>;

    const next = vi.fn() as NextFunction;

    const middleware = requireRole('admin');
    await middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
