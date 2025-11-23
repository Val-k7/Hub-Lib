/**
 * Tests unitaires pour le middleware d'authentification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authMiddleware, optionalAuthMiddleware, requireOwnership, requireRole } from '../auth.js';
import { authService } from '../../services/authService.js';
import { prisma } from '../../config/database.js';

// Mock authService et Prisma
vi.mock('../../services/authService.js', () => ({
  authService: {
    verifyAccessToken: vi.fn(),
    getUserById: vi.fn(),
  },
}));

vi.mock('../../config/database.js', () => ({
  prisma: {
    profile: {
      findUnique: vi.fn(),
    },
  },
}));

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait accepter une requête avec un token valide', async () => {
    const req = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    } as Partial<Request>;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    vi.mocked(authService.verifyAccessToken).mockReturnValue({
      userId: 'user-123',
      email: 'test@example.com',
    });
    vi.mocked(authService.getUserById).mockResolvedValue({
      userId: 'user-123',
      email: 'test@example.com',
    } as any);

    await authMiddleware(req as Request, res, next);

    expect(req.user).toBeDefined();
    expect(req.user?.userId).toBe('user-123');
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

    vi.mocked(authService.verifyAccessToken).mockImplementation(() => {
      throw new Error('Token invalide');
    });

    await authMiddleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('optionalAuthMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait accepter une requête avec un token valide', async () => {
    const req = {
      headers: {
        authorization: 'Bearer valid-token',
      },
    } as Partial<Request>;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    vi.mocked(authService.verifyAccessToken).mockReturnValue({
      userId: 'user-123',
      email: 'test@example.com',
    });
    vi.mocked(authService.getUserById).mockResolvedValue({
      userId: 'user-123',
      email: 'test@example.com',
    } as any);

    await optionalAuthMiddleware(req as Request, res, next);

    expect(req.user).toBeDefined();
    expect(next).toHaveBeenCalled();
  });

  it('devrait accepter une requête sans token', async () => {
    const req = {
      headers: {},
    } as Partial<Request>;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await optionalAuthMiddleware(req as Request, res, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  it('devrait accepter un utilisateur avec le rôle requis', () => {
    const req = {
      user: {
        userId: 'user-123',
        role: 'admin',
      },
    } as Partial<Request>;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    const middleware = requireRole('admin');
    middleware(req as Request, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('devrait rejeter un utilisateur sans le rôle requis', () => {
    const req = {
      user: {
        userId: 'user-123',
        role: 'user',
      },
    } as Partial<Request>;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as Partial<Response>;

    const next = vi.fn() as NextFunction;

    const middleware = requireRole('admin');
    middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireOwnership', () => {
  it('devrait accepter si l\'utilisateur est le propriétaire', () => {
    const req = {
      user: {
        userId: 'user-123',
      },
      params: {
        userId: 'user-123',
      },
    } as Partial<Request>;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    const middleware = requireOwnership('userId');
    middleware(req as Request, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('devrait rejeter si l\'utilisateur n\'est pas le propriétaire', () => {
    const req = {
      user: {
        userId: 'user-123',
      },
      params: {
        userId: 'user-456',
      },
    } as Partial<Request>;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as Partial<Response>;

    const next = vi.fn() as NextFunction;

    const middleware = requireOwnership('userId');
    middleware(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

