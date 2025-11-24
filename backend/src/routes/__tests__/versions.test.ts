/**
 * Tests d'intégration pour les routes de versions de ressources
 * Utilise de vraies connexions à la base de données
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import versionRoutes from '../versions.js';
import { createTestUser, deleteTestUser, createTestAuthMiddleware, type TestUser, isDatabaseAvailable } from '../../test/helpers.js';
import { prisma } from '../../config/database.js';

const app = express();
app.use(express.json());
app.use('/api/resources/:resourceId/versions', versionRoutes);

describe('GET /api/resources/:resourceId/versions', () => {
  let testUser: TestUser;
  let testResource: { id: string; userId: string };

  beforeEach(async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }
    testUser = await createTestUser();
    
    // Créer une ressource de test
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
      await prisma.resourceVersion.deleteMany({
        where: { resourceId: testResource.id },
      });
      await prisma.resource.delete({ where: { id: testResource.id } });
    }
    if (testUser?.userId) {
      await deleteTestUser(testUser.userId);
    }
  });

  it('devrait récupérer la liste des versions d\'une ressource', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    // Créer des versions de test
    const version1 = await prisma.resourceVersion.create({
      data: {
        resourceId: testResource.id,
        versionNumber: 1,
        title: 'Version 1',
        description: 'Description version 1',
        content: { test: 'data1' },
      },
    });

    const version2 = await prisma.resourceVersion.create({
      data: {
        resourceId: testResource.id,
        versionNumber: 2,
        title: 'Version 2',
        description: 'Description version 2',
        content: { test: 'data2' },
      },
    });

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/resources/:resourceId/versions', versionRoutes);

    const response = await request(testApp)
      .get(`/api/resources/${testResource.id}/versions`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
    expect(response.body[0]).toHaveProperty('versionNumber');
  });

  it('devrait retourner 404 si la ressource n\'existe pas', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/resources/:resourceId/versions', versionRoutes);

    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request(testApp)
      .get(`/api/resources/${fakeId}/versions`);

    expect(response.status).toBe(404);
  });
});

describe('POST /api/resources/:resourceId/versions', () => {
  let testUser: TestUser;
  let testResource: { id: string; userId: string };

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
      await prisma.resourceVersion.deleteMany({
        where: { resourceId: testResource.id },
      });
      await prisma.resource.delete({ where: { id: testResource.id } });
    }
    if (testUser?.userId) {
      await deleteTestUser(testUser.userId);
    }
  });

  it('devrait créer une nouvelle version d\'une ressource', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/resources/:resourceId/versions', createTestAuthMiddleware(testUser), versionRoutes);

    const response = await request(testApp)
      .post(`/api/resources/${testResource.id}/versions`)
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({
        changeSummary: 'Nouvelle version',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('versionNumber');
    expect(response.body).toHaveProperty('resourceId', testResource.id);
    expect(response.body.versionNumber).toBe(1); // Première version
  });

  it('devrait incrémenter automatiquement le numéro de version', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    // Créer une première version
    await prisma.resourceVersion.create({
      data: {
        resourceId: testResource.id,
        versionNumber: 1,
        title: 'Version 1',
        content: { test: 'data1' },
      },
    });

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/resources/:resourceId/versions', createTestAuthMiddleware(testUser), versionRoutes);

    const response = await request(testApp)
      .post(`/api/resources/${testResource.id}/versions`)
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({
        changeSummary: 'Deuxième version',
      });

    expect(response.status).toBe(201);
    expect(response.body.versionNumber).toBe(2);
  });
});

describe('POST /api/resources/:resourceId/versions/:versionId/restore', () => {
  let testUser: TestUser;
  let testResource: { id: string; userId: string };
  let testVersion: { id: string; resourceId: string; versionNumber: number };

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

    testVersion = await prisma.resourceVersion.create({
      data: {
        resourceId: testResource.id,
        versionNumber: 1,
        title: 'Version to Restore',
        description: 'Description',
        content: { test: 'restore data' },
      },
    });
  });

  afterEach(async () => {
    if (testResource?.id) {
      await prisma.resourceVersion.deleteMany({
        where: { resourceId: testResource.id },
      });
      await prisma.resource.delete({ where: { id: testResource.id } });
    }
    if (testUser?.userId) {
      await deleteTestUser(testUser.userId);
    }
  });

  it('devrait restaurer une version d\'une ressource', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/resources/:resourceId/versions', createTestAuthMiddleware(testUser), versionRoutes);

    const response = await request(testApp)
      .post(`/api/resources/${testResource.id}/versions/${testVersion.id}/restore`)
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
  });
});

describe('DELETE /api/resources/:resourceId/versions/:versionId', () => {
  let testUser: TestUser;
  let testResource: { id: string; userId: string };
  let testVersion: { id: string; resourceId: string };

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

    testVersion = await prisma.resourceVersion.create({
      data: {
        resourceId: testResource.id,
        versionNumber: 1,
        title: 'Version to Delete',
        content: { test: 'data' },
      },
    });
  });

  afterEach(async () => {
    if (testResource?.id) {
      await prisma.resourceVersion.deleteMany({
        where: { resourceId: testResource.id },
      });
      await prisma.resource.delete({ where: { id: testResource.id } });
    }
    if (testUser?.userId) {
      await deleteTestUser(testUser.userId);
    }
  });

  it('devrait supprimer une version d\'une ressource', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/resources/:resourceId/versions', createTestAuthMiddleware(testUser), versionRoutes);

    const response = await request(testApp)
      .delete(`/api/resources/${testResource.id}/versions/${testVersion.id}`)
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);

    // Vérifier que la version a été supprimée
    const deleted = await prisma.resourceVersion.findUnique({
      where: { id: testVersion.id },
    });
    expect(deleted).toBeNull();
  });
});
