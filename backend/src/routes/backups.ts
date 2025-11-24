/**
 * Routes pour la gestion des backups
 * Permet de créer, lister et restaurer des backups de la base de données
 */

import express, { Request, Response } from 'express';
import { backupService } from '../services/backupService.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { strictRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

const router = express.Router();

// Toutes les routes nécessitent l'authentification et le rôle admin
router.use(authMiddleware);
router.use(requireRole('admin'));
router.use(strictRateLimit);

const restoreSchema = z.object({
  filename: z.string().min(1),
});

/**
 * @swagger
 * /api/backups/create:
 *   post:
 *     summary: Crée un backup manuel de la base de données
 *     description: Crée un backup SQL de la base de données PostgreSQL
 *     tags: [Backups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Backup créé avec succès
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 backup:
 *                   type: object
 *                   properties:
 *                     filename:
 *                       type: string
 *                     size:
 *                       type: integer
 *                     sizeMB:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       500:
 *         description: Erreur lors de la création du backup
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/create',
  asyncHandler(async (_req: Request, res: Response) => {
    logger.info('Création d\'un backup manuel demandée');

    const result = await backupService.createBackup();

    if (!result.success) {
      throw new AppError(
        result.error || 'Erreur lors de la création du backup',
        500,
        'BACKUP_FAILED'
      );
    }

    res.status(201).json({
      message: 'Backup créé avec succès',
      backup: {
        filename: result.filename,
        size: result.size,
        sizeMB: result.size ? (result.size / 1024 / 1024).toFixed(2) : undefined,
        timestamp: result.timestamp,
      },
    });
  })
);

/**
 * GET /api/backups
 * Liste tous les backups disponibles
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const backups = await backupService.listBackups();

    res.json({
      backups: backups.map((backup) => ({
        filename: backup.filename,
        size: backup.size,
        sizeMB: (backup.size / 1024 / 1024).toFixed(2),
        date: backup.date,
      })),
      count: backups.length,
    });
  })
);

/**
 * POST /api/backups/restore
 * Restaure un backup
 */
router.post(
  '/restore',
  asyncHandler(async (req: Request, res: Response) => {
    const { filename } = restoreSchema.parse(req.body);

    logger.warn(`Restauration d'un backup demandée: ${filename}`);

    const result = await backupService.restoreBackup(filename);

    if (!result.success) {
      throw new AppError(
        result.error || 'Erreur lors de la restauration',
        500,
        'RESTORE_FAILED'
      );
    }

    res.json({
      message: 'Backup restauré avec succès',
      filename,
    });
  })
);

/**
 * GET /api/backups/config
 * Obtient la configuration des backups
 */
router.get(
  '/config',
  asyncHandler(async (_req: Request, res: Response) => {
    const config = backupService.getConfig();

    res.json({
      config: {
        enabled: config.enabled,
        schedule: config.schedule,
        retentionDays: config.retentionDays,
        backupDir: config.backupDir,
        compress: config.compress,
      },
    });
  })
);

export default router;

