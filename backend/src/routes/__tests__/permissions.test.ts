/**
 * Tests d'intégration pour les routes de permissions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../server.js';
import { createTestUser, getAuthToken } from '../../test/helpers.js';
import { prisma } from '../../config/database.js';

describe('Routes /api/permissions', () => {
  let adminUser: { id: string; email: string };
  let regularUser: { id: string; email: string };
  let adminToken: string;
  let userToken: string;

  beforeEach(async () => {
    // Créer un utilisateur admin et un utilisateur régulier
    adminUser = await createTestUser({
      email: 'admin@test.com',
      role: 'admin',
    });
    regularUser = await createTestUser({
      email: 'user@test.com',
      role: 'user',
    });

    adminToken = await getAuthToken(adminUser.id);
    userToken = await getAuthToken(regularUser.id);
  });

  afterEach(async () => {
    // Nettoyer les données de test
    await prisma.userRole.deleteMany({
      where: {
        userId: { in: [adminUser.id, regularUser.id] },
      },
    });
    await prisma.profile.deleteMany({
      where: {
        userId: { in: [adminUser.id, regularUser.id] },
      },
    });
  });

  describe('GET /api/permissions/user/:userId', () => {
    it('devrait retourner les permissions d\'un utilisateur', async () => {
      const response = await request(app)
        .get(`/api/permissions/user/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('userId', adminUser.id);
      expect(response.body.data).toHaveProperty('role');
      expect(response.body.data).toHaveProperty('permissions');
      expect(Array.isArray(response.body.data.permissions)).toBe(true);
    });

    it('devrait retourner 401 si non authentifié', async () => {
      await request(app)
        .get(`/api/permissions/user/${adminUser.id}`)
        .expect(401);
    });

    it('devrait retourner 403 si l\'utilisateur n\'est pas admin', async () => {
      await request(app)
        .get(`/api/permissions/user/${adminUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /api/permissions', () => {
    it('devrait retourner la liste des permissions', async () => {
      const response = await request(app)
        .get('/api/permissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('devrait retourner 401 si non authentifié', async () => {
      await request(app)
        .get('/api/permissions')
        .expect(401);
    });
  });
});

