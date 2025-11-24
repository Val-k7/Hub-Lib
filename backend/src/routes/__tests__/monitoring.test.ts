/**
 * Tests d'intégration pour les routes de monitoring
 * Utilise de vraies connexions DB et Redis
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import monitoringRoutes from '../monitoring.js';
import { createTestUser, deleteTestUser, createTestAuthMiddleware, type TestUser, isDatabaseAvailable } from '../../test/helpers.js';
import { monitoringService } from '../../services/monitoringService.js';
import { prisma } from '../../config/database.js';
import { redis } from '../../config/redis.js';

const app = express();
app.use(express.json());
app.use('/api/monitoring', monitoringRoutes);

describe('GET /api/monitoring/health', () => {
  it('devrait retourner le statut de santé de tous les services', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/monitoring', monitoringRoutes);

    const response = await request(testApp).get('/api/monitoring/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status');
    expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.status);
    expect(response.body).toHaveProperty('checks');
    expect(Array.isArray(response.body.checks)).toBe(true);
  });
});

describe('GET /api/monitoring/metrics', () => {
  let testUser: TestUser;

  beforeEach(async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }
    testUser = await createTestUser({ role: 'admin' });
  });

  afterEach(async () => {
    if (testUser?.userId) {
      await deleteTestUser(testUser.userId);
    }
  });

  it('devrait retourner les métriques système', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/monitoring', createTestAuthMiddleware(testUser), monitoringRoutes);

    const response = await request(testApp)
      .get('/api/monitoring/metrics')
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('memory');
    expect(response.body).toHaveProperty('cpu');
    expect(response.body).toHaveProperty('uptime');
  });
});

describe('GET /api/monitoring/stats', () => {
  let testUser: TestUser;

  beforeEach(async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }
    testUser = await createTestUser({ role: 'admin' });
  });

  afterEach(async () => {
    if (testUser?.userId) {
      await deleteTestUser(testUser.userId);
    }
  });

  it('devrait retourner les statistiques de l\'application', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/monitoring', createTestAuthMiddleware(testUser), monitoringRoutes);

    const response = await request(testApp)
      .get('/api/monitoring/stats')
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('users');
    expect(response.body).toHaveProperty('resources');
    expect(response.body).toHaveProperty('collections');
    expect(typeof response.body.users).toBe('number');
    expect(typeof response.body.resources).toBe('number');
  });
});

describe('GET /api/monitoring/prometheus', () => {
  it('devrait retourner les métriques au format Prometheus', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/monitoring', monitoringRoutes);

    const response = await request(testApp).get('/api/monitoring/prometheus');

    expect(response.status).toBe(200);
    expect(response.text).toContain('# HELP');
    expect(response.text).toContain('# TYPE');
  });
});
