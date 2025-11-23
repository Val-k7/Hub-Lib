/**
 * Configuration des variables d'environnement
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Charger les variables d'environnement
dotenv.config();

// Schéma de validation pour les variables d'environnement
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3001'),
  API_BASE_URL: z.string().url().default('http://localhost:3001'),

  // PostgreSQL
  DATABASE_URL: z.string().url(),
  POSTGRES_HOST: z.string().default('postgres'),
  POSTGRES_PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('5432'),
  POSTGRES_DB: z.string().default('hub_lib'),
  POSTGRES_USER: z.string().default('hub_lib_user'),
  POSTGRES_PASSWORD: z.string(),

  // Redis
  REDIS_HOST: z.string().default('redis'),
  REDIS_PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('6379'),
  REDIS_PASSWORD: z.string(),
  REDIS_URL: z.string().url().optional(),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().int().positive()).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().int().positive()).default('100'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // OAuth (Optionnel)
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

// Valider et parser les variables d'environnement
const parseResult = envSchema.safeParse(process.env);

if (!parseResult.success) {
  console.error('❌ Erreur de validation des variables d\'environnement:');
  console.error(parseResult.error.format());
  process.exit(1);
}

export const env = parseResult.data;

// Exports pour faciliter l'accès
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';


