/**
 * Tests d'intégration pour les routes de ressources
 * Utilise de vraies connexions à la base de données
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import resourceRoutes from '../resources.js';
import { createTestUser, deleteTestUser, createTestAuthMiddleware, type TestUser, isDatabaseAvailable } from '../../test/helpers.js';
import { prisma } from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());
app.use('/api/resources', resourceRoutes);

describe('GET /api/resources', () => {
  let testUser: TestUser;
  let testResources: Array<{ id: string }>;

  beforeEach(async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }
    testUser = await createTestUser();

    // Créer quelques ressources de test
    const resource1 = await prisma.resource.create({
      data: {
        userId: testUser.userId,
        title: 'Test Resource 1',
        description: 'Description 1',
        visibility: 'public',
        resourceType: 'file_upload',
      },
    });

    const resource2 = await prisma.resource.create({
      data: {
        userId: testUser.userId,
        title: 'Test Resource 2',
        description: 'Description 2',
        visibility: 'public',
        resourceType: 'external_link',
      },
    });

    testResources = [resource1, resource2];
  });

  afterEach(async () => {
    if (testResources) {
      for (const resource of testResources) {
        await prisma.resource.delete({ where: { id: resource.id } });
      }
    }
    if (testUser?.userId) {
      await deleteTestUser(testUser.userId);
    }
  });

  it('devrait récupérer la liste des ressources', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/resources', resourceRoutes);

    const response = await request(testApp).get('/api/resources');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('devrait filtrer les ressources par catégorie', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/resources', resourceRoutes);

    const response = await request(testApp)
      .get('/api/resources')
      .query({ category: 'development' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });
});

describe('GET /api/resources/:id', () => {
  let testUser: TestUser;
  let testResource: { id: string };

  beforeEach(async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }
    testUser = await createTestUser();

    testResource = await prisma.resource.create({
      data: {
        userId: testUser.userId,
        title: 'Test Resource',
        description: 'Test Description',
        visibility: 'public',
        resourceType: 'file_upload',
      },
    });
  });

  afterEach(async () => {
    if (testResource?.id) {
      await prisma.resource.delete({ where: { id: testResource.id } });
    }
    if (testUser?.userId) {
      await deleteTestUser(testUser.userId);
    }
  });

  it('devrait récupérer une ressource par ID', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/resources', resourceRoutes);

    const response = await request(testApp)
      .get(`/api/resources/${testResource.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', testResource.id);
    expect(response.body).toHaveProperty('title', 'Test Resource');
  });

  it('devrait retourner 404 si la ressource n\'existe pas', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/resources', resourceRoutes);

    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request(testApp)
      .get(`/api/resources/${fakeId}`);

    expect(response.status).toBe(404);
  });
});

describe('POST /api/resources', () => {
  let testUser: TestUser;

  beforeEach(async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }
    testUser = await createTestUser();
  });

  afterEach(async () => {
    if (testUser?.userId) {
      // Nettoyer les ressources créées
      await prisma.resource.deleteMany({
        where: { userId: testUser.userId },
      });
      await deleteTestUser(testUser.userId);
    }
  });

  it('devrait créer une nouvelle ressource', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/resources', createTestAuthMiddleware(testUser), resourceRoutes);

    const response = await request(testApp)
      .post('/api/resources')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({
        title: 'New Resource',
        description: 'New Description',
        visibility: 'public',
        resourceType: 'file_upload',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('title', 'New Resource');
    expect(response.body).toHaveProperty('userId', testUser.userId);
  });

  it('devrait rejeter une requête sans titre', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/resources', createTestAuthMiddleware(testUser), resourceRoutes);

    const response = await request(testApp)
      .post('/api/resources')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({
        description: 'Description without title',
        visibility: 'public',
        resourceType: 'file_upload',
      });

    expect(response.status).toBe(400);
  });
});

describe('PUT /api/resources/:id', () => {
  let testUser: TestUser;
  let testResource: { id: string };

  beforeEach(async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }
    testUser = await createTestUser();

    testResource = await prisma.resource.create({
      data: {
        userId: testUser.userId,
        title: 'Original Title',
        description: 'Original Description',
        visibility: 'public',
        resourceType: 'file_upload',
      },
    });
  });

  afterEach(async () => {
    if (testResource?.id) {
      await prisma.resource.delete({ where: { id: testResource.id } });
    }
    if (testUser?.userId) {
      await deleteTestUser(testUser.userId);
    }
  });

  it('devrait mettre à jour une ressource', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/resources', createTestAuthMiddleware(testUser), resourceRoutes);

    const response = await request(testApp)
      .put(`/api/resources/${testResource.id}`)
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({
        title: 'Updated Title',
        description: 'Updated Description',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('title', 'Updated Title');
    expect(response.body).toHaveProperty('description', 'Updated Description');
  });
});

describe('DELETE /api/resources/:id', () => {
  let testUser: TestUser;
  let testResource: { id: string };

  beforeEach(async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }
    testUser = await createTestUser();

    testResource = await prisma.resource.create({
      data: {
        userId: testUser.userId,
        title: 'Resource to Delete',
        description: 'Description',
        visibility: 'public',
        resourceType: 'file_upload',
      },
    });
  });

  afterEach(async () => {
    if (testUser?.userId) {
      await deleteTestUser(testUser.userId);
    }
  });

  it('devrait supprimer une ressource', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/resources', createTestAuthMiddleware(testUser), resourceRoutes);

    const response = await request(testApp)
      .delete(`/api/resources/${testResource.id}`)
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);

    // Vérifier que la ressource a été supprimée
    const deleted = await prisma.resource.findUnique({
      where: { id: testResource.id },
    });
    expect(deleted).toBeNull();
  });
});
