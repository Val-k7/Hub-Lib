/**
 * Types pour l'authentification
 */

import { AppRole } from '@prisma/client';

/**
 * Utilisateur retourné après authentification
 */
export interface AuthUser {
  id: string;
  userId: string;
  email: string;
  username: string | null;
  fullName: string | null;
  avatarUrl?: string | null;
  role?: AppRole | null;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Réponse d'inscription
 */
export interface SignUpResponse {
  user: AuthUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

/**
 * Réponse de connexion
 */
export interface SignInResponse {
  user: AuthUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

