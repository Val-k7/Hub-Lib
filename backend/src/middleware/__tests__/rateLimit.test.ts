/**
 * Tests unitaires pour le middleware de rate limiting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { generalRateLimit } from '../rateLimit.js';
import { redis } from '../../config/redis.js';

// Mock Redis
vi.mock('../../config/redis.js', () => ({
  redis: {
    incr: vi.fn(),
    pexpire: vi.fn(),
    pttl: vi.fn(),
  },
}));

describe('rateLimit middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait permettre les requêtes dans la limite', async () => {
    const req = {
      ip: '127.0.0.1',
      path: '/api/test',
      socket: { remoteAddress: '127.0.0.1' },
    } as Partial<Request>;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
    } as Partial<Response>;

    const next = vi.fn() as NextFunction;

    vi.mocked(redis.incr).mockResolvedValue(5);
    vi.mocked(redis.pexpire).mockResolvedValue(1);

    await generalRateLimit(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('devrait bloquer les requêtes au-delà de la limite', async () => {
    const req = {
      ip: '127.0.0.1',
      path: '/api/test',
      socket: { remoteAddress: '127.0.0.1' },
    } as Partial<Request>;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
    } as Partial<Response>;

    const next = vi.fn() as NextFunction;

    vi.mocked(redis.incr).mockResolvedValue(101);
    vi.mocked(redis.pttl).mockResolvedValue(5000);

    await generalRateLimit(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
  });
});

