/**
 * Tests unitaires pour authService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authService } from '../authService.js';
import { prisma } from '../../config/database.js';
import bcrypt from 'bcryptjs';

// Mock Prisma
vi.mock('../../config/database.js', () => ({
  prisma: {
    profile: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userRole: {
      findUnique: vi.fn(),
    },
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signup', () => {
    it('devrait créer un nouvel utilisateur avec succès', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      
      // Mock: l'utilisateur n'existe pas
      vi.mocked(prisma.profile.findUnique).mockResolvedValue(null);
      
      // Mock: création de l'utilisateur
      vi.mocked(prisma.profile.create).mockResolvedValue({
        id: 'user-id-123',
        userId: 'user-id-123',
        email,
        username: null,
        fullName: null,
        bio: null,
        avatarUrl: null,
        githubUsername: null,
        preferredLayout: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await authService.signup(email, password);

      expect(result).toHaveProperty('userId');
      expect(result.email).toBe(email);
      expect(prisma.profile.create).toHaveBeenCalled();
    });

    it('ne devrait pas créer un utilisateur si l\'email existe déjà', async () => {
      const email = 'existing@example.com';
      const password = 'password123';

      // Mock: l'utilisateur existe déjà
      vi.mocked(prisma.profile.findUnique).mockResolvedValue({
        id: 'existing-id',
        userId: 'existing-id',
        email,
      } as any);

      await expect(authService.signup(email, password)).rejects.toThrow();
    });
  });

  describe('signin', () => {
    it('devrait connecter un utilisateur avec des identifiants valides', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);

      // Mock: utilisateur trouvé avec mot de passe hashé
      vi.mocked(prisma.profile.findUnique).mockResolvedValue({
        id: 'user-id-123',
        userId: 'user-id-123',
        email,
        // Note: Dans la vraie implémentation, le mot de passe serait dans une table séparée
      } as any);

      // Pour ce test, on suppose que la vérification du mot de passe fonctionne
      const result = await authService.signin(email, password);

      expect(result).toHaveProperty('userId');
      expect(result.email).toBe(email);
    });

    it('ne devrait pas connecter un utilisateur avec un mot de passe incorrect', async () => {
      const email = 'test@example.com';
      const wrongPassword = 'wrongpassword';

      vi.mocked(prisma.profile.findUnique).mockResolvedValue({
        id: 'user-id-123',
        userId: 'user-id-123',
        email,
      } as any);

      await expect(authService.signin(email, wrongPassword)).rejects.toThrow();
    });
  });

  describe('generateTokens', () => {
    it('devrait générer un access token et un refresh token', () => {
      const userId = 'user-id-123';
      const email = 'test@example.com';

      const tokens = authService.generateTokens(userId, email);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
    });
  });

  describe('verifyAccessToken', () => {
    it('devrait vérifier un token valide', () => {
      const userId = 'user-id-123';
      const email = 'test@example.com';
      
      const { accessToken } = authService.generateTokens(userId, email);
      const payload = authService.verifyAccessToken(accessToken);

      expect(payload.userId).toBe(userId);
      expect(payload.email).toBe(email);
    });

    it('devrait rejeter un token invalide', () => {
      const invalidToken = 'invalid.token.here';

      expect(() => authService.verifyAccessToken(invalidToken)).toThrow();
    });
  });
});

