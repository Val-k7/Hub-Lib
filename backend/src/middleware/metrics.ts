/**
 * Middleware pour collecter les métriques Prometheus
 */

import { Request, Response, NextFunction } from 'express';
import { httpRequestCounter, httpRequestDuration, httpErrorCounter } from '../utils/metrics.js';

/**
 * Middleware pour collecter les métriques HTTP
 */
export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();
  const route = req.route?.path || req.path;

  // Compter la requête
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;

    // Incrémenter le compteur de requêtes
    httpRequestCounter.inc({
      method: req.method,
      route,
      status: res.statusCode.toString(),
    });

    // Enregistrer la durée
    httpRequestDuration.observe(
      {
        method: req.method,
        route,
      },
      duration
    );

    // Compter les erreurs (4xx, 5xx)
    if (res.statusCode >= 400) {
      httpErrorCounter.inc({
        method: req.method,
        route,
        status: res.statusCode.toString(),
      });
    }
  });

  next();
};

