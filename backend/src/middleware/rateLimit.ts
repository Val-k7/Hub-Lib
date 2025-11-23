/**
 * Middleware de rate limiting avec Redis
 */

import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
  message?: string;
}

/**
 * Middleware de rate limiting basé sur Redis
 */
export const rateLimit = (options: RateLimitOptions = {}) => {
  const windowMs = options.windowMs || env.RATE_LIMIT_WINDOW_MS;
  const maxRequests = options.maxRequests || env.RATE_LIMIT_MAX_REQUESTS;
  const keyGenerator = options.keyGenerator || defaultKeyGenerator;
  const message = options.message || 'Trop de requêtes, veuillez réessayer plus tard';

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = keyGenerator(req);
      const redisKey = `ratelimit:${key}`;

      // Obtenir le nombre actuel de requêtes
      const current = await redis.incr(redisKey);

      // Si c'est la première requête dans la fenêtre, définir l'expiration
      if (current === 1) {
        await redis.pexpire(redisKey, windowMs);
      }

      // Vérifier si la limite est dépassée
      if (current > maxRequests) {
        const ttl = await redis.pttl(redisKey);
        const retryAfter = Math.ceil(ttl / 1000);

        res.status(429).json({
          error: message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter,
        });
        return;
      }

      // Ajouter les headers de rate limiting
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - current).toString());
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + windowMs).toISOString());

      next();
    } catch (error: any) {
      logger.error(`Erreur dans rate limiting: ${error.message}`);
      // En cas d'erreur Redis, permettre la requête pour éviter de bloquer l'API
      next();
    }
  };
};

/**
 * Génère une clé par défaut basée sur l'IP et l'utilisateur
 */
function defaultKeyGenerator(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userId = req.user?.userId || 'anonymous';
  
  // Utiliser l'userId s'il est authentifié, sinon l'IP
  return req.user ? `user:${userId}` : `ip:${ip}`;
}

/**
 * Rate limiting strict pour les endpoints d'authentification
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 tentatives max
  message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes',
  keyGenerator: (req) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `auth:${ip}`;
  },
});

/**
 * Rate limiting pour les endpoints généraux
 */
export const generalRateLimit = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
});

/**
 * Rate limiting strict pour les endpoints sensibles (admin, etc.)
 */
export const strictRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requêtes max par minute
  message: 'Trop de requêtes sur cet endpoint sensible',
});


