/**
 * Configuration du logger Winston
 */

import winston from 'winston';
import { env } from '../config/env.js';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  transports: [
    // Console
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // Fichier pour les erreurs
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat,
    }),
    // Fichier pour tous les logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat,
    }),
  ],
});

// En production, aussi logger les erreurs critiques
if (env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/critical.log',
      level: 'error',
      format: logFormat,
    })
  );
}



