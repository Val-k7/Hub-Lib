/**
 * Service de backup automatique pour PostgreSQL
 * Gère les sauvegardes régulières de la base de données
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

const execAsync = promisify(exec);

interface BackupConfig {
  enabled: boolean;
  schedule: string; // Cron expression
  retentionDays: number;
  backupDir: string;
  compress: boolean;
}

interface BackupResult {
  success: boolean;
  filename?: string;
  size?: number;
  error?: string;
  timestamp: Date;
}

class BackupService {
  private config: BackupConfig;
  private backupDir: string;
  private isRunning: boolean = false;

  constructor() {
    this.config = {
      enabled: env.NODE_ENV === 'production',
      schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Tous les jours à 2h du matin
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10),
      backupDir: process.env.BACKUP_DIR || join(process.cwd(), 'backups'),
      compress: process.env.BACKUP_COMPRESS !== 'false',
    };

    this.backupDir = this.config.backupDir;

    // Créer le répertoire de backup s'il n'existe pas
    this.ensureBackupDirectory();
  }

  /**
   * Crée le répertoire de backup s'il n'existe pas
   */
  private async ensureBackupDirectory(): Promise<void> {
    if (!existsSync(this.backupDir)) {
      await mkdir(this.backupDir, { recursive: true });
      logger.info(`Répertoire de backup créé: ${this.backupDir}`);
    }
  }

  /**
   * Effectue un backup de la base de données PostgreSQL
   */
  async createBackup(): Promise<BackupResult> {
    if (this.isRunning) {
      return {
        success: false,
        error: 'Un backup est déjà en cours',
        timestamp: new Date(),
      };
    }

    if (!this.config.enabled) {
      logger.info('Backup désactivé (NODE_ENV !== production)');
      return {
        success: false,
        error: 'Backup désactivé',
        timestamp: new Date(),
      };
    }

    this.isRunning = true;
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().replace(/[:.]/g, '-').split('T')[0];
    const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = `hub-lib-backup-${dateStr}-${timeStr}.sql`;
    const filepath = join(this.backupDir, filename);
    const compressedFilepath = `${filepath}.gz`;

    try {
      await this.ensureBackupDirectory();

      // Construire la commande pg_dump
      const pgDumpCommand = [
        'pg_dump',
        `--host=${env.POSTGRES_HOST}`,
        `--port=${env.POSTGRES_PORT}`,
        `--username=${env.POSTGRES_USER}`,
        `--dbname=${env.POSTGRES_DB}`,
        '--no-password', // Utiliser .pgpass ou variable d'environnement
        '--format=plain',
        '--verbose',
        '--clean',
        '--if-exists',
        '--create',
      ].join(' ');

      // Variables d'environnement pour pg_dump
      const envVars = {
        ...process.env,
        PGPASSWORD: env.POSTGRES_PASSWORD,
      };

      logger.info(`Début du backup: ${filename}`);

      // Exécuter pg_dump
      const { stdout, stderr } = await execAsync(pgDumpCommand, {
        env: envVars,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      if (stderr && !stderr.includes('NOTICE')) {
        logger.warn(`Avertissements pg_dump: ${stderr}`);
      }

      // Écrire le fichier SQL
      await writeFile(filepath, stdout, 'utf8');

      let finalFilepath = filepath;
      let finalSize: number;

      // Compresser si activé
      if (this.config.compress) {
        logger.info(`Compression du backup: ${filename}`);
        const { stdout: gzipOutput } = await execAsync(`gzip -f "${filepath}"`, {
          env: envVars,
        });
        finalFilepath = compressedFilepath;
        logger.info(`Backup compressé: ${compressedFilepath}`);
      }

      // Obtenir la taille du fichier
      const { stdout: sizeOutput } = await execAsync(`stat -f%z "${finalFilepath}"`).catch(
        () => execAsync(`stat -c%s "${finalFilepath}"`)
      );
      finalSize = parseInt(sizeOutput.trim(), 10);

      logger.info(`Backup terminé: ${finalFilepath} (${(finalSize / 1024 / 1024).toFixed(2)} MB)`);

      // Nettoyer les anciens backups
      await this.cleanupOldBackups();

      this.isRunning = false;

      return {
        success: true,
        filename: finalFilepath,
        size: finalSize,
        timestamp,
      };
    } catch (error) {
      this.isRunning = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Erreur lors du backup', error instanceof Error ? error : new Error(errorMessage));

      return {
        success: false,
        error: errorMessage,
        timestamp,
      };
    }
  }

  /**
   * Nettoie les anciens backups selon la règle de rétention
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const files = await readdir(this.backupDir);
      const now = Date.now();
      const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;

      let deletedCount = 0;

      for (const file of files) {
        if (!file.startsWith('hub-lib-backup-') || (!file.endsWith('.sql') && !file.endsWith('.sql.gz'))) {
          continue;
        }

        const filepath = join(this.backupDir, file);
        const stats = await import('fs/promises').then((fs) => fs.stat(filepath));
        const fileAge = now - stats.mtimeMs;

        if (fileAge > retentionMs) {
          await unlink(filepath);
          deletedCount++;
          logger.info(`Ancien backup supprimé: ${file}`);
        }
      }

      if (deletedCount > 0) {
        logger.info(`${deletedCount} ancien(s) backup(s) supprimé(s)`);
      }
    } catch (error) {
      logger.error('Erreur lors du nettoyage des anciens backups', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Liste tous les backups disponibles
   */
  async listBackups(): Promise<Array<{ filename: string; size: number; date: Date }>> {
    try {
      await this.ensureBackupDirectory();
      const files = await readdir(this.backupDir);
      const backups: Array<{ filename: string; size: number; date: Date }> = [];

      for (const file of files) {
        if (!file.startsWith('hub-lib-backup-') || (!file.endsWith('.sql') && !file.endsWith('.sql.gz'))) {
          continue;
        }

        const filepath = join(this.backupDir, file);
        const stats = await import('fs/promises').then((fs) => fs.stat(filepath));

        backups.push({
          filename: file,
          size: stats.size,
          date: stats.mtime,
        });
      }

      // Trier par date (plus récent en premier)
      backups.sort((a, b) => b.date.getTime() - a.date.getTime());

      return backups;
    } catch (error) {
      logger.error('Erreur lors de la liste des backups', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
  }

  /**
   * Restaure un backup
   */
  async restoreBackup(filename: string): Promise<{ success: boolean; error?: string }> {
    if (this.isRunning) {
      return {
        success: false,
        error: 'Un backup/restore est déjà en cours',
      };
    }

    this.isRunning = true;

    try {
      const filepath = join(this.backupDir, filename);

      if (!existsSync(filepath)) {
        return {
          success: false,
          error: `Fichier de backup non trouvé: ${filename}`,
        };
      }

      logger.info(`Début de la restauration: ${filename}`);

      // Décompresser si nécessaire
      let sqlFile = filepath;
      if (filename.endsWith('.gz')) {
        const decompressedFile = filepath.replace('.gz', '');
        await execAsync(`gunzip -c "${filepath}" > "${decompressedFile}"`);
        sqlFile = decompressedFile;
      }

      // Construire la commande psql
      const psqlCommand = [
        'psql',
        `--host=${env.POSTGRES_HOST}`,
        `--port=${env.POSTGRES_PORT}`,
        `--username=${env.POSTGRES_USER}`,
        `--dbname=${env.POSTGRES_DB}`,
        '--no-password',
        '--file',
        sqlFile,
      ].join(' ');

      const envVars = {
        ...process.env,
        PGPASSWORD: env.POSTGRES_PASSWORD,
      };

      const { stderr } = await execAsync(psqlCommand, {
        env: envVars,
        maxBuffer: 10 * 1024 * 1024,
      });

      if (stderr && !stderr.includes('NOTICE')) {
        logger.warn(`Avertissements psql: ${stderr}`);
      }

      // Nettoyer le fichier décompressé temporaire
      if (filename.endsWith('.gz')) {
        await unlink(sqlFile).catch(() => {
          // Ignorer les erreurs de suppression
        });
      }

      logger.info(`Restauration terminée: ${filename}`);

      this.isRunning = false;

      return {
        success: true,
      };
    } catch (error) {
      this.isRunning = false;
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Erreur lors de la restauration', error instanceof Error ? error : new Error(errorMessage));

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Obtient la configuration actuelle
   */
  getConfig(): BackupConfig {
    return { ...this.config };
  }
}

export const backupService = new BackupService();

