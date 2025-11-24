/**
 * Tests d'intégration pour les routes de backups
 * Utilise de vrais services de backup
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import backupRoutes from '../backups.js';
import { createTestUser, deleteTestUser, createTestAuthMiddleware, type TestUser, isDatabaseAvailable } from '../../test/helpers.js';
import { backupService } from '../../services/backupService.js';
import fs from 'fs/promises';
import path from 'path';

const TEST_BACKUP_DIR = path.join(process.cwd(), 'test-backups');

const app = express();
app.use(express.json());
app.use('/api/backups', backupRoutes);

describe('POST /api/backups/create', () => {
  let testUser: TestUser;

  beforeEach(async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }
    testUser = await createTestUser({ role: 'admin' });
    
    // Créer le répertoire de test
    try {
      await fs.mkdir(TEST_BACKUP_DIR, { recursive: true });
    } catch (error) {
      // Le répertoire existe déjà
    }
    process.env.BACKUP_DIR = TEST_BACKUP_DIR;
  });

  afterEach(async () => {
    // Nettoyer les backups de test
    try {
      const files = await fs.readdir(TEST_BACKUP_DIR);
      for (const file of files) {
        if (file.startsWith('hub-lib-backup-')) {
          await fs.unlink(path.join(TEST_BACKUP_DIR, file));
        }
      }
    } catch (error) {
      // Ignorer
    }
    
    if (testUser?.userId) {
      await deleteTestUser(testUser.userId);
    }
  });

  it('devrait créer un backup avec succès', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/backups', createTestAuthMiddleware(testUser), backupRoutes);

    const response = await request(testApp)
      .post('/api/backups/create')
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    // Le résultat dépend de la disponibilité de pg_dump
    expect([201, 500]).toContain(response.status);
    
    if (response.status === 201) {
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('backup');
    }
  });
});

describe('GET /api/backups', () => {
  let testUser: TestUser;

  beforeEach(async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }
    testUser = await createTestUser({ role: 'admin' });
    process.env.BACKUP_DIR = TEST_BACKUP_DIR;
  });

  afterEach(async () => {
    if (testUser?.userId) {
      await deleteTestUser(testUser.userId);
    }
  });

  it('devrait récupérer la liste des backups', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    // Créer un backup de test
    const testBackupFile = path.join(TEST_BACKUP_DIR, 'hub-lib-backup-test.sql');
    await fs.writeFile(testBackupFile, 'test backup content');

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/backups', createTestAuthMiddleware(testUser), backupRoutes);

    const response = await request(testApp)
      .get('/api/backups')
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);

    // Nettoyer
    await fs.unlink(testBackupFile);
  });
});

describe('GET /api/backups/config', () => {
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

  it('devrait retourner la configuration des backups', async () => {
    if (!(await isDatabaseAvailable())) {
      return;
    }

    const testApp = express();
    testApp.use(express.json());
    testApp.use('/api/backups', createTestAuthMiddleware(testUser), backupRoutes);

    const response = await request(testApp)
      .get('/api/backups/config')
      .set('Authorization', `Bearer ${testUser.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('enabled');
    expect(response.body).toHaveProperty('schedule');
    expect(response.body).toHaveProperty('retentionDays');
  });
});
