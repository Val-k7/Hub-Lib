/**
 * Tests unitaires pour le middleware de gestion d'erreurs
 */

import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../errorHandler.js';
import { AppError } from '../errorHandler.js';
import { ZodError } from 'zod';

describe('errorHandler', () => {
  it('devrait gérer les erreurs AppError', () => {
    const req = {} as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as Partial<Response>;
    const next = vi.fn() as NextFunction;

    const error = new AppError('Erreur test', 400);

    errorHandler(error, req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Erreur test',
      })
    );
  });

  it('devrait gérer les erreurs Zod', () => {
    const req = {} as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as Partial<Response>;
    const next = vi.fn() as NextFunction;

    const zodError = new ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['email'],
        message: 'Expected string, received number',
      },
    ]);

    errorHandler(zodError, req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Erreur de validation',
      })
    );
  });

  it('devrait gérer les erreurs génériques', () => {
    const req = {} as Request;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as Partial<Response>;
    const next = vi.fn() as NextFunction;

    const error = new Error('Erreur générique');

    errorHandler(error, req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Erreur serveur',
      })
    );
  });
});

