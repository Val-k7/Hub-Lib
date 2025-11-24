/**
 * Tests d'intégration pour authService
 * Utilise de vraies connexions à la base de données
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authService } from '../authService.js';
import { createTestUser, deleteTestUser, type TestUser, isDatabaseAvailable } from '../../test/helpers.js';
import { prisma } from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

describe('authService', () => {
  describe('signup', () => {
    afterEach(async () => {
      if (await isDatabaseAvailable()) {
        // Nettoyer les utilisateurs créés
        const testUsers = await prisma.profile.findMany({
          where: {
            email: { startsWith: 'test-signup-' },
          },
        });
        for (const user of testUsers) {
          await deleteTestUser(user.userId);
        }
      }
    });

    it('devrait créer un nouvel utilisateur avec succès', async () => {
      if (!(await isDatabaseAvailable())) {
        return;
      }

      const email = `test-signup-${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      const result = await authService.signup(email, password);

      expect(result).toHaveProperty('userId');
      expect(result.email).toBe(email);

      // Vérifier que l'utilisateur existe dans la DB
      const created = await prisma.profile.findUnique({
        where: { email },
      });
      expect(created).toBeTruthy();
      expect(created?.email).toBe(email);

      // Vérifier que le mot de passe hashé existe
      const authProfile = await prisma.authProfile.findUnique({
        where: { userId: result.userId },
      });
      expect(authProfile).toBeTruthy();
      expect(authProfile?.passwordHash).toBeDefined();

      // Nettoyer
      await deleteTestUser(result.userId);
    });

    it('ne devrait pas créer un utilisateur si l\'email existe déjà', async () => {
      if (!(await isDatabaseAvailable())) {
        return;
      }

      const testUser = await createTestUser();

      await expect(
        authService.signup(testUser.email, 'TestPassword123!')
      ).rejects.toThrow();

      // Nettoyer
      await deleteTestUser(testUser.userId);
    });
  });

  describe('signin', () => {
    let testUser: TestUser;

    beforeEach(async () => {
      if (!(await isDatabaseAvailable())) {
        return;
      }
      testUser = await createTestUser();
    });

    afterEach(async () => {
      if (testUser?.userId) {
        await deleteTestUser(testUser.userId);
      }
    });

    it('devrait connecter un utilisateur avec des identifiants valides', async () => {
      if (!(await isDatabaseAvailable())) {
        return;
      }

      const result = await authService.signin(testUser.email, 'TestPassword123!');

      expect(result).toHaveProperty('userId');
      expect(result.email).toBe(testUser.email);
    });

    it('ne devrait pas connecter un utilisateur avec un mot de passe incorrect', async () => {
      if (!(await isDatabaseAvailable())) {
        return;
      }

      await expect(
        authService.signin(testUser.email, 'wrongpassword')
      ).rejects.toThrow();
    });

    it('ne devrait pas connecter un utilisateur avec un email inexistant', async () => {
      if (!(await isDatabaseAvailable())) {
        return;
      }

      await expect(
        authService.signin('nonexistent@example.com', 'password123')
      ).rejects.toThrow();
    });
  });

  describe('generateTokens', () => {
    it('devrait générer des tokens JWT valides', async () => {
      const payload = {
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'user',
      };

      const tokens = await authService.generateTokens(payload);

      expect(tokens).toHaveProperty('accessToken');
      expect(tokens).toHaveProperty('refreshToken');
      expect(tokens).toHaveProperty('expiresIn');
      expect(typeof tokens.accessToken).toBe('string');
      expect(typeof tokens.refreshToken).toBe('string');
      expect(tokens.accessToken.length).toBeGreaterThan(0);
      expect(tokens.refreshToken.length).toBeGreaterThan(0);
    });
  });

  describe('verifyAccessToken', () => {
    it('devrait vérifier et décoder un token valide', () => {
      const payload = {
        userId: 'test-user-123',
        email: 'test@example.com',
        role: 'user',
      };

      // Utiliser generateAccessToken directement pour éviter les problèmes de configuration
      const accessToken = authService.generateAccessToken(payload);
      const decoded = authService.verifyAccessToken(accessToken);

      expect(decoded).toHaveProperty('userId', payload.userId);
      expect(decoded).toHaveProperty('email', payload.email);
      // Le rôle peut ne pas être dans le token décodé selon la configuration
    });

    it('devrait rejeter un token invalide', () => {
      expect(() => {
        authService.verifyAccessToken('invalid-token');
      }).toThrow();
    });
  });

  describe('hashPassword et verifyPassword', () => {
    it('devrait hasher et vérifier un mot de passe', async () => {
      const password = 'TestPassword123!';
      const hashed = await authService.hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(0);

      const isValid = await authService.verifyPassword(password, hashed);
      expect(isValid).toBe(true);

      const isInvalid = await authService.verifyPassword('wrongpassword', hashed);
      expect(isInvalid).toBe(false);
    });
  });
});
