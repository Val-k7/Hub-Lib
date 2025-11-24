/**
 * Tests d'intégration pour les routes de tokens API
 * Utilise de vraies connexions à la base de données
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import apiTokenRoutes from '../apiTokens.js';
import { createTestUser, deleteTestUser, createTestAuthMiddleware, type TestUser, isDatabaseAvailable } from '../../test/helpers.js';
import { prisma } from '../../config/database.js';

const app = express();
app.use(express.json());
app.use('/api/api-tokens', apiTokenRoutes);

describe('GET /api/api-tokens', () => {
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

  it('devrait récupérer la liste des tokens API de l\'utilisateur', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/api-tokens', createTestAuthMiddleware(testUser), apiTokenRoutes);

    // Créer un token API de test
    const token = await prisma.apiToken.create({
      data: {
        userId: testUser.userId,
        name: 'Test Token',
        token: `hub_lib_${Math.random().toString(36).substring(2, 15)}`,
      },
    });

    const response = await request(testApp)
      .get('/api/api-tokens')
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    
    // Nettoyer le token
    await prisma.apiToken.delete({ where: { id: token.id } });
  });
});

describe('POST /api/api-tokens', () => {
  let testUser: TestUser;

  beforeEach(async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }
    testUser = await createTestUser();
  });

  afterEach(async () => {
    if (testUser?.userId) {
      // Nettoyer les tokens API
      await prisma.apiToken.deleteMany({
        where: { userId: testUser.userId },
      });
      await deleteTestUser(testUser.userId);
    }
  });

  it('devrait créer un nouveau token API', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/api-tokens', createTestAuthMiddleware(testUser), apiTokenRoutes);

    const response = await request(testApp)
      .post('/api/api-tokens')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({ name: 'New Token' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body.token).toMatch(/^hub_lib_/);
    expect(response.body).toHaveProperty('name', 'New Token');
    expect(response.body).toHaveProperty('id');
  });

  it('devrait rejeter une requête sans nom', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/api-tokens', createTestAuthMiddleware(testUser), apiTokenRoutes);

    const response = await request(testApp)
      .post('/api/api-tokens')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({});

    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/api-tokens/:id', () => {
  let testUser: TestUser;
  let otherUser: TestUser;

  beforeEach(async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }
    testUser = await createTestUser();
    otherUser = await createTestUser();
  });

  afterEach(async () => {
    if (testUser?.userId) {
      await prisma.apiToken.deleteMany({
        where: { userId: testUser.userId },
      });
      await deleteTestUser(testUser.userId);
    }
    if (otherUser?.userId) {
      await prisma.apiToken.deleteMany({
        where: { userId: otherUser.userId },
      });
      await deleteTestUser(otherUser.userId);
    }
  });

  it('devrait supprimer un token API', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    // Créer un token API
    const token = await prisma.apiToken.create({
      data: {
        userId: testUser.userId,
        name: 'Token to Delete',
        token: `hub_lib_${Math.random().toString(36).substring(2, 15)}`,
      },
    });

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/api-tokens', createTestAuthMiddleware(testUser), apiTokenRoutes);

    const response = await request(testApp)
      .delete(`/api/api-tokens/${token.id}`)
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);

    // Vérifier que le token a été supprimé
    const deletedToken = await prisma.apiToken.findUnique({
      where: { id: token.id },
    });
    expect(deletedToken).toBeNull();
  });

  it('devrait rejeter la suppression d\'un token qui n\'existe pas', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/api-tokens', createTestAuthMiddleware(testUser), apiTokenRoutes);

    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request(testApp)
      .delete(`/api/api-tokens/${fakeId}`)
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    expect(response.status).toBe(404);
  });

  it('devrait rejeter la suppression d\'un token d\'un autre utilisateur', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    // Créer un token pour l'autre utilisateur
    const token = await prisma.apiToken.create({
      data: {
        userId: otherUser.userId,
        name: 'Other User Token',
        token: `hub_lib_${Math.random().toString(36).substring(2, 15)}`,
      },
    });

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/api-tokens', createTestAuthMiddleware(testUser), apiTokenRoutes);

    const response = await request(testApp)
      .delete(`/api/api-tokens/${token.id}`)
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    expect(response.status).toBe(403);

    // Nettoyer
    await prisma.apiToken.delete({ where: { id: token.id } });
  });
});
