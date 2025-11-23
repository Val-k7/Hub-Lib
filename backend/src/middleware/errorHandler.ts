/**
 * Middleware de gestion d'erreurs centralisée
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Classe d'erreur personnalisée pour l'API
 */
export class AppError extends Error implements ApiError {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware de gestion d'erreurs global
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log de l'erreur
  logger.error('Erreur capturée:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // Erreur Zod (validation)
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Erreur de validation',
      code: 'VALIDATION_ERROR',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Erreur Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    handlePrismaError(err, res);
    return;
  }

  // Erreur personnalisée AppError
  if ('statusCode' in err && err.statusCode) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code || 'ERROR',
      ...(err.details && { details: err.details }),
      ...(env.NODE_ENV === 'development' && { stack: err.stack }),
    });
    return;
  }

  // Erreur JWT
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Token invalide',
      code: 'INVALID_TOKEN',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Token expiré',
      code: 'EXPIRED_TOKEN',
    });
    return;
  }

  // Erreur par défaut (500)
  res.status(500).json({
    error: env.NODE_ENV === 'production' 
      ? 'Erreur serveur interne' 
      : err.message,
    code: 'INTERNAL_ERROR',
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Gère les erreurs Prisma
 */
function handlePrismaError(err: Prisma.PrismaClientKnownRequestError, res: Response): void {
  switch (err.code) {
    case 'P2002':
      // Contrainte unique violée
      res.status(409).json({
        error: 'Cette ressource existe déjà',
        code: 'DUPLICATE_ENTRY',
        details: {
          target: err.meta?.target,
        },
      });
      break;

    case 'P2025':
      // Enregistrement non trouvé
      res.status(404).json({
        error: 'Ressource non trouvée',
        code: 'NOT_FOUND',
      });
      break;

    case 'P2003':
      // Contrainte de clé étrangère violée
      res.status(400).json({
        error: 'Référence invalide',
        code: 'FOREIGN_KEY_CONSTRAINT',
        details: {
          field: err.meta?.field_name,
        },
      });
      break;

    default:
      logger.error(`Erreur Prisma non gérée: ${err.code}`, err);
      res.status(500).json({
        error: 'Erreur de base de données',
        code: 'DATABASE_ERROR',
        ...(env.NODE_ENV === 'development' && {
          details: {
            code: err.code,
            meta: err.meta,
          },
        }),
      });
  }
}

/**
 * Wrapper async pour les route handlers - capture les erreurs automatiquement
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};


