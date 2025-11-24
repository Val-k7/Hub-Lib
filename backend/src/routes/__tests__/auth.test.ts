/**
 * Tests d'intégration pour les routes d'authentification
 * Utilise de vraies connexions à la base de données
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../auth.js';
import { createTestUser, deleteTestUser, type TestUser, isDatabaseAvailable } from '../../test/helpers.js';
import { prisma } from '../../config/database.js';
import { authService } from '../../services/authService.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('POST /api/auth/signup', () => {
  afterEach(async () => {
    // Nettoyer les utilisateurs créés pendant les tests
    if (await isDatabaseAvailable()) {
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

  it('devrait créer un nouvel utilisateur', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const email = `test-signup-${Date.now()}@example.com`;
    const password = 'TestPassword123!';

    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        email,
        password,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('access_token');
    expect(response.body).toHaveProperty('refresh_token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('email', email);

    // Nettoyer
    const createdUser = await prisma.profile.findUnique({
      where: { email },
    });
    if (createdUser) {
      await deleteTestUser(createdUser.userId);
    }
  });

  it('devrait rejeter une requête sans email', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        password: 'password123',
      });

    expect(response.status).toBe(400);
  });

  it('devrait rejeter une requête sans mot de passe', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'test@example.com',
      });

    expect(response.status).toBe(400);
  });

  it('ne devrait pas créer un utilisateur si l\'email existe déjà', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    // Créer un utilisateur d'abord
    const testUser = await createTestUser();

    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        email: testUser.email,
        password: 'TestPassword123!',
      });

    expect(response.status).toBe(409);

    // Nettoyer
    await deleteTestUser(testUser.userId);
  });
});

describe('POST /api/auth/signin', () => {
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

    const response = await request(app)
      .post('/api/auth/signin')
      .send({
        email: testUser.email,
        password: 'TestPassword123!',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('access_token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toHaveProperty('email', testUser.email);
  });

  it('devrait rejeter des identifiants invalides', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const response = await request(app)
      .post('/api/auth/signin')
      .send({
        email: testUser.email,
        password: 'wrongpassword',
      });

    expect(response.status).toBe(401);
  });

  it('devrait rejeter un email inexistant', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const response = await request(app)
      .post('/api/auth/signin')
      .send({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(401);
  });
});

describe('POST /api/auth/refresh', () => {
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

  it('devrait rafraîchir un token valide', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const response = await request(app)
      .post('/api/auth/refresh')
      .send({
        refresh_token: testUser.refreshToken,
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('access_token');
    expect(response.body).toHaveProperty('refresh_token');
  });

  it('devrait rejeter un refresh token invalide', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({
        refresh_token: 'invalid-refresh-token',
      });

    expect(response.status).toBe(401);
  });
});
