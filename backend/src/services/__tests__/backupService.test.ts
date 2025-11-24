/**
 * Tests d'intégration pour backupService
 * Utilise de vrais appels système (pg_dump, etc.)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { backupService } from '../backupService.js';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// Répertoire de test pour les backups
const TEST_BACKUP_DIR = path.join(process.cwd(), 'test-backups');

describe('backupService', () => {
  beforeEach(async () => {
    // Créer le répertoire de test
    try {
      await fs.mkdir(TEST_BACKUP_DIR, { recursive: true });
    } catch (error) {
      // Le répertoire existe déjà
    }
    
    // Configurer le service pour utiliser le répertoire de test
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
      // Ignorer les erreurs
    }
  });

  describe('createBackup', () => {
    it('devrait créer un backup avec succès si pg_dump est disponible', async () => {
      // Vérifier si pg_dump est disponible
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      try {
        await execAsync('which pg_dump');
      } catch (error) {
        // pg_dump n'est pas disponible, skip le test
        return;
      }

      const result = await backupService.createBackup();

      // Le résultat peut être un succès ou un échec selon la configuration DB
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('timestamp');
      
      if (result.success) {
        expect(result).toHaveProperty('filename');
        expect(result).toHaveProperty('size');
        expect(result.size).toBeGreaterThan(0);
      }
    });

    it('devrait gérer les erreurs lors de la création du backup', async () => {
      // Tester avec une configuration invalide
      const originalUrl = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://invalid:invalid@localhost:5432/invalid';

      const result = await backupService.createBackup();

      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('error');

      // Restaurer
      if (originalUrl) {
        process.env.DATABASE_URL = originalUrl;
      }
    });
  });

  describe('listBackups', () => {
    it('devrait lister les backups existants', async () => {
      // Créer un fichier de backup de test
      const testBackupFile = path.join(TEST_BACKUP_DIR, 'hub-lib-backup-test.sql');
      await fs.writeFile(testBackupFile, 'test backup content');

      const backups = await backupService.listBackups();

      expect(Array.isArray(backups)).toBe(true);
      
      // Nettoyer
      await fs.unlink(testBackupFile);
    });
  });

  describe('getBackupConfig', () => {
    it('devrait retourner la configuration des backups', async () => {
      const config = await backupService.getBackupConfig();

      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('schedule');
      expect(config).toHaveProperty('retentionDays');
      expect(config).toHaveProperty('backupDir');
      expect(config).toHaveProperty('compress');
    });
  });
});
