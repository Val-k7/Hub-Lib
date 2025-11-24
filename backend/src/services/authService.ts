/**
 * Service d'authentification JWT
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { sessionService } from './sessionService.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';
import { AppRole } from '@prisma/client';
import type { AuthUser, SignUpResponse, SignInResponse } from '../types/auth.js';

// Schémas de validation
export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  username: z.string().min(3).max(50).optional(),
  fullName: z.string().min(2).max(100).optional(),
});

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role?: AppRole;
}

class AuthService {
  /**
   * Hash un mot de passe
   */
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Vérifie un mot de passe
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Génère un token JWT d'accès
   */
  generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as string,
    } as jwt.SignOptions);
  }

  /**
   * Génère un token JWT de rafraîchissement
   */
  generateRefreshToken(payload: JWTPayload): string {
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as string,
    } as jwt.SignOptions);
  }

  /**
   * Vérifie et décode un token JWT d'accès
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    } catch (error) {
      throw new Error('Token invalide ou expiré');
    }
  }

  /**
   * Vérifie et décode un token JWT de rafraîchissement
   */
  verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET) as JWTPayload;
    } catch (error) {
      throw new Error('Refresh token invalide ou expiré');
    }
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  async signUp(data: {
    email: string;
    password: string;
    username?: string;
    fullName?: string;
  }): Promise<SignUpResponse> {
    // Valider les données
    const validatedData = signUpSchema.parse(data);

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.profile.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      throw new Error('Cet email est déjà utilisé');
    }

    // Vérifier si le username existe déjà (si fourni)
    if (validatedData.username) {
      const existingUsername = await prisma.profile.findUnique({
        where: { username: validatedData.username },
      });

      if (existingUsername) {
        throw new Error('Ce nom d\'utilisateur est déjà pris');
      }
    }

    // Créer l'utilisateur et le profil en transaction
    const result = await prisma.$transaction(async (tx) => {
      // Générer un userId UUID
      const userId = crypto.randomUUID();

      // Créer le profil
      const profile = await tx.profile.create({
        data: {
          userId,
          email: validatedData.email,
          username: validatedData.username || validatedData.email.split('@')[0],
          fullName: validatedData.fullName || validatedData.username || validatedData.email.split('@')[0],
        },
      });

      // Créer le rôle utilisateur par défaut
      await tx.userRole.create({
        data: {
          userId,
          role: 'user',
        },
      });

      // Stocker le mot de passe hashé dans la table d'authentification
      const passwordHash = await this.hashPassword(validatedData.password);
      await tx.authProfile.create({
        data: {
          userId,
          passwordHash,
        },
      });

      return profile;
    });

    // Récupérer le rôle de l'utilisateur
    const userRole = await prisma.userRole.findUnique({
      where: { userId: result.userId },
    });

    // Générer les tokens avec le rôle
    const tokens = await this.generateTokens({
      userId: result.userId,
      email: result.email,
      role: userRole?.role || 'user',
    });

    // Stocker la session dans Redis
    await sessionService.createSession(result.userId, tokens.refreshToken);

    logger.info(`Nouvel utilisateur inscrit: ${result.email}`);

    // Envoyer un email de bienvenue de manière asynchrone
    try {
      const { emailService } = await import('./emailService.js');
      emailService.sendWelcomeEmail(result.email, {
        name: result.fullName || undefined,
        username: result.username || undefined,
      }).catch((error) => {
        // Ne pas bloquer l'inscription si l'email échoue
        logger.warn(`Échec de l'envoi de l'email de bienvenue à ${result.email}:`, error);
      });
    } catch (error) {
      // Ignorer les erreurs d'import si le service n'est pas disponible
      logger.debug('Service email non disponible pour l\'envoi de bienvenue');
    }

    return {
      user: {
        id: result.id,
        userId: result.userId,
        email: result.email,
        username: result.username,
        fullName: result.fullName,
      },
      tokens,
    };
  }

  /**
   * Connexion d'un utilisateur
   */
  async signIn(email: string, password: string): Promise<SignInResponse> {
    // Valider les données
    const validatedData = signInSchema.parse({ email, password });

    // Trouver l'utilisateur
    const profile = await prisma.profile.findUnique({
      where: { email: validatedData.email },
      include: {
        userRole: true,
      },
    });

    if (!profile) {
      throw new Error('Email ou mot de passe incorrect');
    }

    // Vérifier le mot de passe depuis la table d'authentification
    const authProfile = await prisma.authProfile.findUnique({
      where: { userId: profile.userId },
    });

    if (!authProfile) {
      throw new Error('Email ou mot de passe incorrect');
    }

    const isValidPassword = await this.verifyPassword(validatedData.password, authProfile.passwordHash);
    if (!isValidPassword) {
      throw new Error('Email ou mot de passe incorrect');
    }

    // Générer les tokens
    const tokens = await this.generateTokens({
      userId: profile.userId,
      email: profile.email,
      role: profile.userRole?.role,
    });

    // Stocker la session dans Redis
    await sessionService.createSession(profile.userId, tokens.refreshToken);

    logger.info(`Utilisateur connecté: ${profile.email}`);

    return {
      user: {
        id: profile.id,
        userId: profile.userId,
        email: profile.email,
        username: profile.username,
        fullName: profile.fullName,
        role: profile.userRole?.role,
      },
      tokens,
    };
  }

  /**
   * Déconnexion d'un utilisateur
   */
  async signOut(userId: string, refreshToken: string): Promise<void> {
    // Supprimer la session de Redis
    await sessionService.deleteSession(userId, refreshToken);
    logger.info(`Utilisateur déconnecté: ${userId}`);
  }

  /**
   * Rafraîchir les tokens
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    // Vérifier le refresh token
    const payload = this.verifyRefreshToken(refreshToken);

    // Vérifier que la session existe dans Redis
    const isValidSession = await sessionService.validateSession(payload.userId, refreshToken);
    if (!isValidSession) {
      throw new Error('Session invalide');
    }

    // Récupérer les informations de l'utilisateur
    const profile = await prisma.profile.findUnique({
      where: { userId: payload.userId },
      include: {
        userRole: true,
      },
    });

    if (!profile) {
      throw new Error('Utilisateur non trouvé');
    }

    // Générer de nouveaux tokens
    const tokens = await this.generateTokens({
      userId: profile.userId,
      email: profile.email,
      role: profile.userRole?.role,
    });

    // Mettre à jour la session dans Redis
    await sessionService.updateSession(payload.userId, refreshToken, tokens.refreshToken);

    return tokens;
  }

  /**
   * Génère les tokens d'accès et de rafraîchissement (public pour OAuth)
   */
  async generateTokens(payload: JWTPayload): Promise<AuthTokens> {
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Calculer l'expiration en secondes
    const expiresIn = this.getTokenExpirationInSeconds(env.JWT_EXPIRES_IN);

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Convertit une durée (ex: "7d") en secondes
   */
  private getTokenExpirationInSeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 604800; // 7 jours par défaut

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    switch (unit) {
      case 's':
        return num;
      case 'm':
        return num * 60;
      case 'h':
        return num * 3600;
      case 'd':
        return num * 86400;
      default:
        return 604800;
    }
  }

  /**
   * Vérifie si un utilisateur a un rôle spécifique
   */
  async hasRole(userId: string, role: 'admin' | 'user'): Promise<boolean> {
    const userRole = await prisma.userRole.findUnique({
      where: { userId },
    });

    return userRole?.role === role;
  }

  /**
   * Récupère les informations d'un utilisateur par son userId
   */
  async getUserById(userId: string): Promise<any | null> {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        userRole: true,
      },
    });

    if (!profile) return null;

    return {
      id: profile.id,
      userId: profile.userId,
      email: profile.email,
      username: profile.username,
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      role: profile.userRole?.role,
    };
  }

  /**
   * Récupère un utilisateur par son email (pour OAuth)
   */
  async getUserByEmail(email: string): Promise<any | null> {
    const profile = await prisma.profile.findUnique({
      where: { email },
      include: {
        userRole: true,
      },
    });

    if (!profile) return null;

    return {
      id: profile.id,
      userId: profile.userId,
      email: profile.email,
      username: profile.username,
      fullName: profile.fullName,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      role: profile.userRole?.role,
    };
  }
}

export const authService = new AuthService();



