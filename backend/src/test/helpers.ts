/**
 * Helpers pour les tests d'intégration
 * Fournit des utilitaires pour créer des utilisateurs de test, générer des tokens, etc.
 */

import { prisma } from '../config/database.js';
import { authService } from '../services/authService.js';
import { v4 as uuidv4 } from 'uuid';
import { AppRole } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';

export interface TestUser {
  userId: string;
  email: string;
  username?: string;
  role?: string;
  accessToken: string;
  refreshToken: string;
}

/**
 * Vérifie si la base de données est accessible
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Vérifie si Redis est accessible
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const { redis } = await import('../config/redis.js');
    await redis.ping();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Crée un utilisateur de test avec authentification
 */
export async function createTestUser(overrides?: {
  email?: string;
  username?: string;
  password?: string;
  role?: string;
}): Promise<TestUser> {
  // Vérifier que la base de données est accessible
  const dbAvailable = await isDatabaseAvailable();
  if (!dbAvailable) {
    throw new Error('Base de données non accessible. Les tests d\'intégration nécessitent une connexion PostgreSQL.');
  }

  const email = overrides?.email || `test-${uuidv4()}@example.com`;
  const username = overrides?.username || `testuser-${uuidv4().substring(0, 8)}`;
  const password = overrides?.password || 'TestPassword123!';

  // Créer le profil
  const userId = uuidv4();
  const profile = await prisma.profile.create({
    data: {
      userId,
      email,
      username,
    },
  });

  // Créer le mot de passe hashé
  const passwordHash = await authService.hashPassword(password);
  await prisma.authProfile.create({
    data: {
      userId: profile.userId,
      passwordHash,
    },
  });

  // Créer le rôle si spécifié
  if (overrides?.role) {
    await prisma.userRole.create({
      data: {
        userId: profile.userId,
        role: (overrides.role as AppRole) || 'user',
      },
    });
  }

  // Générer les tokens
  const tokens = await authService.generateTokens({
    userId: profile.userId,
    email: profile.email,
    role: (overrides?.role || 'user') as AppRole,
  });

  return {
    userId: profile.userId,
    email: profile.email,
    username: profile.username || undefined,
    role: overrides?.role || 'user',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

/**
 * Supprime un utilisateur de test
 */
export async function deleteTestUser(userId: string): Promise<void> {
  try {
    // Supprimer les relations
    await prisma.authProfile.deleteMany({
      where: { userId },
    });
    await prisma.userRole.deleteMany({
      where: { userId },
    });
    await prisma.profile.delete({
      where: { userId },
    });
  } catch (error) {
    // Ignorer les erreurs si l'utilisateur n'existe pas
  }
}

/**
 * Obtient un token d'authentification pour un utilisateur
 */
export async function getAuthToken(userId: string): Promise<string> {
  const userRole = await prisma.userRole.findUnique({
    where: { userId },
  });
  
  const profile = await prisma.profile.findUnique({
    where: { userId },
  });

  if (!profile) {
    throw new Error('Profil non trouvé');
  }

  const tokens = await authService.generateTokens({
    userId: profile.userId,
    email: profile.email,
    role: (userRole?.role || 'user') as AppRole,
  });

  return tokens.accessToken;
}

/**
 * Crée un middleware d'authentification de test
 */
export function createTestAuthMiddleware(testUser: TestUser) {
  return (req: Request, res: Response, next: NextFunction) => {
    (req as Request & { user?: { userId: string; email: string; role: string } }).user = {
      userId: testUser.userId,
      email: testUser.email,
      role: testUser.role || 'user',
    };
    next();
  };
}

