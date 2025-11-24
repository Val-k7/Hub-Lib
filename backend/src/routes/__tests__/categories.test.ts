/**
 * Tests d'intégration pour les routes de catégories
 * Utilise de vraies connexions à la base de données
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import categoryRoutes from '../categories.js';
import { createTestUser, deleteTestUser, createTestAuthMiddleware, type TestUser, isDatabaseAvailable } from '../../test/helpers.js';
import { prisma } from '../../config/database.js';
import { cacheService } from '../../services/cacheService.js';

const app = express();
app.use(express.json());
app.use('/api/categories', categoryRoutes);

describe('GET /api/categories', () => {
  beforeEach(async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }
    // Nettoyer le cache avant chaque test
    await cacheService.delete('categories:all');
  });

  it('devrait récupérer la liste des catégories', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    // Créer quelques catégories de test
    const category1 = await prisma.categoryHierarchy.create({
      data: {
        name: 'Test Category 1',
        description: 'Description 1',
        orderIndex: 0,
        isActive: true,
      },
    });

    const category2 = await prisma.categoryHierarchy.create({
      data: {
        name: 'Test Category 2',
        description: 'Description 2',
        orderIndex: 1,
        isActive: true,
      },
    });

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/categories', categoryRoutes);

    const response = await request(testApp).get('/api/categories');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(2);

    // Nettoyer
    await prisma.categoryHierarchy.deleteMany({
      where: { id: { in: [category1.id, category2.id] } },
    });
    await cacheService.delete('categories:all');
  });

  it('devrait utiliser le cache si disponible', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const cachedCategories = [
      { id: 'cached-1', name: 'Cached Category' },
    ];

    // Mettre en cache
    await cacheService.set('categories:all', cachedCategories, 3600);

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/categories', categoryRoutes);

    const response = await request(testApp).get('/api/categories');

    expect(response.status).toBe(200);
    // Le cache devrait être utilisé
    await cacheService.delete('categories:all');
  });
});

describe('POST /api/categories', () => {
  let testUser: TestUser;

  beforeEach(async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }
    testUser = await createTestUser({ role: 'admin' });
    await cacheService.delete('categories:all');
  });

  afterEach(async () => {
    if (testUser?.userId) {
      // Nettoyer les catégories créées
      await prisma.categoryHierarchy.deleteMany({
        where: { name: { startsWith: 'Test Category' } },
      });
      await cacheService.delete('categories:all');
      await deleteTestUser(testUser.userId);
    }
  });

  it('devrait créer une nouvelle catégorie', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/categories', createTestAuthMiddleware(testUser), categoryRoutes);

    const response = await request(testApp)
      .post('/api/categories')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({
        name: 'Test Category New',
        description: 'Description',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('name', 'Test Category New');
    expect(response.body).toHaveProperty('id');

    // Vérifier que la catégorie existe dans la DB
    const created = await prisma.categoryHierarchy.findUnique({
      where: { id: response.body.id },
    });
    expect(created).toBeTruthy();
    expect(created?.name).toBe('Test Category New');
  });

  it('devrait rejeter une catégorie avec un nom existant', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    // Créer une catégorie existante
    const existing = await prisma.categoryHierarchy.create({
      data: {
        name: 'Existing Category',
        description: 'Description',
        orderIndex: 0,
        isActive: true,
      },
    });

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/categories', createTestAuthMiddleware(testUser), categoryRoutes);

    const response = await request(testApp)
      .post('/api/categories')
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({
        name: 'Existing Category',
        description: 'Description',
      });

    expect(response.status).toBe(400);

    // Nettoyer
    await prisma.categoryHierarchy.delete({ where: { id: existing.id } });
  });
});

describe('GET /api/categories/:id', () => {
  let testCategory: { id: string; name: string };

  beforeEach(async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }
    testCategory = await prisma.categoryHierarchy.create({
      data: {
        name: 'Test Category Get',
        description: 'Description',
        orderIndex: 0,
        isActive: true,
      },
    });
  });

  afterEach(async () => {
    if (testCategory?.id) {
      await prisma.categoryHierarchy.delete({ where: { id: testCategory.id } });
    }
  });

  it('devrait récupérer une catégorie par ID', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/categories', categoryRoutes);

    const response = await request(testApp)
      .get(`/api/categories/${testCategory.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', testCategory.id);
    expect(response.body).toHaveProperty('name', 'Test Category Get');
  });

  it('devrait retourner 404 si la catégorie n\'existe pas', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/categories', categoryRoutes);

    const fakeId = '00000000-0000-0000-0000-000000000000';
    const response = await request(testApp)
      .get(`/api/categories/${fakeId}`);

    expect(response.status).toBe(404);
  });
});

describe('POST /api/categories/:id/filters', () => {
  let testUser: TestUser;
  let testCategory: { id: string };

  beforeEach(async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }
    testUser = await createTestUser({ role: 'admin' });
    testCategory = await prisma.categoryHierarchy.create({
      data: {
        name: 'Test Category Filters',
        description: 'Description',
        orderIndex: 0,
        isActive: true,
      },
    });
  });

  afterEach(async () => {
    if (testCategory?.id) {
      await prisma.categoryFilter.deleteMany({
        where: { categoryId: testCategory.id },
      });
      await prisma.categoryHierarchy.delete({ where: { id: testCategory.id } });
    }
    if (testUser?.userId) {
      await deleteTestUser(testUser.userId);
    }
  });

  it('devrait créer un filtre pour une catégorie', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/categories', createTestAuthMiddleware(testUser), categoryRoutes);

    const response = await request(testApp)
      .post(`/api/categories/${testCategory.id}/filters`)
      .set('Authorization', `Bearer ${testUser.accessToken}`)
      .send({
        filterKey: 'test_filter',
        filterType: 'text',
        filterLabel: 'Test Filter',
        isRequired: false,
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('filterKey', 'test_filter');
    expect(response.body).toHaveProperty('categoryId', testCategory.id);
  });
});
