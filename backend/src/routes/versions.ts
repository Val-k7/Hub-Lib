/**
 * Routes pour les versions de ressources
 */

import express from 'express';
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authMiddleware, optionalAuthMiddleware, requireOwnership } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Schémas de validation
const createVersionSchema = z.object({
  changeSummary: z.string().optional(),
});

/**
 * GET /api/resources/:resourceId/versions
 * Liste toutes les versions d'une ressource
 */
router.get(
  '/:resourceId/versions',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { resourceId } = req.params;

    // Vérifier que la ressource existe
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { id: true, userId: true, visibility: true },
    });

    if (!resource) {
      throw new AppError('Ressource non trouvée', 404);
    }

    // Vérifier les permissions de visibilité
    if (resource.visibility === 'private' && (!req.user || req.user.userId !== resource.userId)) {
      throw new AppError('Accès non autorisé', 403);
    }

    // Récupérer toutes les versions
    const versions = await prisma.resourceVersion.findMany({
      where: { resourceId },
      include: {
        creator: {
          select: {
            userId: true,
            email: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        versionNumber: 'desc',
      },
    });

    res.json({
      resourceId,
      versions: versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        title: v.title,
        description: v.description,
        category: v.category,
        tags: v.tags,
        githubUrl: v.githubUrl,
        externalUrl: v.externalUrl,
        language: v.language,
        readme: v.readme,
        filePath: v.filePath,
        fileUrl: v.fileUrl,
        fileSize: v.fileSize,
        changeSummary: v.changeSummary,
        createdAt: v.createdAt,
        creator: v.creator ? {
          userId: v.creator.userId,
          email: v.creator.email,
          username: v.creator.username,
          fullName: v.creator.fullName,
          avatarUrl: v.creator.avatarUrl,
        } : null,
      })),
    });
  })
);

/**
 * GET /api/resources/:resourceId/versions/:versionNumber
 * Récupère une version spécifique d'une ressource
 */
router.get(
  '/:resourceId/versions/:versionNumber',
  optionalAuthMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { resourceId, versionNumber } = req.params;
    const versionNum = parseInt(versionNumber, 10);

    if (isNaN(versionNum) || versionNum < 1) {
      throw new AppError('Numéro de version invalide', 400);
    }

    // Vérifier que la ressource existe
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { id: true, userId: true, visibility: true },
    });

    if (!resource) {
      throw new AppError('Ressource non trouvée', 404);
    }

    // Vérifier les permissions de visibilité
    if (resource.visibility === 'private' && (!req.user || req.user.userId !== resource.userId)) {
      throw new AppError('Accès non autorisé', 403);
    }

    // Récupérer la version
    const version = await prisma.resourceVersion.findUnique({
      where: {
        resourceId_versionNumber: {
          resourceId,
          versionNumber: versionNum,
        },
      },
      include: {
        creator: {
          select: {
            userId: true,
            email: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!version) {
      throw new AppError('Version non trouvée', 404);
    }

    res.json({
      id: version.id,
      resourceId: version.resourceId,
      versionNumber: version.versionNumber,
      title: version.title,
      description: version.description,
      category: version.category,
      tags: version.tags,
      githubUrl: version.githubUrl,
      externalUrl: version.externalUrl,
      language: version.language,
      readme: version.readme,
      filePath: version.filePath,
      fileUrl: version.fileUrl,
      fileSize: version.fileSize,
      changeSummary: version.changeSummary,
      createdAt: version.createdAt,
      creator: version.creator ? {
        userId: version.creator.userId,
        email: version.creator.email,
        username: version.creator.username,
        fullName: version.creator.fullName,
        avatarUrl: version.creator.avatarUrl,
      } : null,
    });
  })
);

/**
 * POST /api/resources/:resourceId/versions
 * Crée une nouvelle version d'une ressource (basée sur l'état actuel)
 */
router.post(
  '/:resourceId/versions',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { resourceId } = req.params;
    const { changeSummary } = createVersionSchema.parse(req.body);

    if (!req.user) {
      throw new AppError('Non authentifié', 401);
    }

    // Vérifier que la ressource existe et que l'utilisateur est propriétaire
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new AppError('Ressource non trouvée', 404);
    }

    if (resource.userId !== req.user.userId) {
      throw new AppError('Seul le propriétaire peut créer des versions', 403);
    }

    // Récupérer le numéro de version actuel
    const currentVersions = await prisma.resourceVersion.findMany({
      where: { resourceId },
      select: { versionNumber: true },
      orderBy: { versionNumber: 'desc' },
      take: 1,
    });

    const nextVersionNumber = currentVersions.length > 0
      ? currentVersions[0].versionNumber + 1
      : 1;

    // Créer la nouvelle version basée sur l'état actuel de la ressource
    const version = await prisma.resourceVersion.create({
      data: {
        resourceId,
        versionNumber: nextVersionNumber,
        title: resource.title,
        description: resource.description,
        category: resource.category || null,
        tags: resource.tags,
        githubUrl: resource.githubUrl || null,
        externalUrl: resource.externalUrl || null,
        language: resource.language || null,
        readme: resource.readme || null,
        filePath: resource.filePath || null,
        fileUrl: resource.fileUrl || null,
        fileSize: resource.fileSize || null,
        createdBy: req.user.userId,
        changeSummary: changeSummary || null,
      },
      include: {
        creator: {
          select: {
            userId: true,
            email: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    logger.info(`Nouvelle version créée: ${version.id} pour ressource ${resourceId}`, {
      versionNumber: nextVersionNumber,
      userId: req.user.userId,
    });

    res.status(201).json({
      id: version.id,
      resourceId: version.resourceId,
      versionNumber: version.versionNumber,
      title: version.title,
      description: version.description,
      category: version.category,
      tags: version.tags,
      githubUrl: version.githubUrl,
      externalUrl: version.externalUrl,
      language: version.language,
      readme: version.readme,
      filePath: version.filePath,
      fileUrl: version.fileUrl,
      fileSize: version.fileSize,
      changeSummary: version.changeSummary,
      createdAt: version.createdAt,
      creator: version.creator ? {
        userId: version.creator.userId,
        email: version.creator.email,
        username: version.creator.username,
        fullName: version.creator.fullName,
        avatarUrl: version.creator.avatarUrl,
      } : null,
    });
  })
);

/**
 * POST /api/resources/:resourceId/versions/:versionNumber/restore
 * Restaure une ressource à une version spécifique
 */
router.post(
  '/:resourceId/versions/:versionNumber/restore',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { resourceId, versionNumber } = req.params;
    const versionNum = parseInt(versionNumber, 10);

    if (isNaN(versionNum) || versionNum < 1) {
      throw new AppError('Numéro de version invalide', 400);
    }

    if (!req.user) {
      throw new AppError('Non authentifié', 401);
    }

    // Vérifier que la ressource existe et que l'utilisateur est propriétaire
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      throw new AppError('Ressource non trouvée', 404);
    }

    if (resource.userId !== req.user.userId) {
      throw new AppError('Seul le propriétaire peut restaurer une version', 403);
    }

    // Récupérer la version à restaurer
    const version = await prisma.resourceVersion.findUnique({
      where: {
        resourceId_versionNumber: {
          resourceId,
          versionNumber: versionNum,
        },
      },
    });

    if (!version) {
      throw new AppError('Version non trouvée', 404);
    }

    // Créer une nouvelle version avec l'état actuel avant la restauration
    const currentVersions = await prisma.resourceVersion.findMany({
      where: { resourceId },
      select: { versionNumber: true },
      orderBy: { versionNumber: 'desc' },
      take: 1,
    });

    const backupVersionNumber = currentVersions.length > 0
      ? currentVersions[0].versionNumber + 1
      : 1;

    // Sauvegarder l'état actuel comme version de backup
    await prisma.resourceVersion.create({
      data: {
        resourceId,
        versionNumber: backupVersionNumber,
        title: resource.title,
        description: resource.description,
        category: resource.category || null,
        tags: resource.tags,
        githubUrl: resource.githubUrl || null,
        externalUrl: resource.externalUrl || null,
        language: resource.language || null,
        readme: resource.readme || null,
        filePath: resource.filePath || null,
        fileUrl: resource.fileUrl || null,
        fileSize: resource.fileSize || null,
        createdBy: req.user.userId,
        changeSummary: `Backup avant restauration de la version ${versionNum}`,
      },
    });

    // Restaurer la ressource à l'état de la version
    const updatedResource = await prisma.resource.update({
      where: { id: resourceId },
      data: {
        title: version.title,
        description: version.description,
        category: version.category || null,
        tags: version.tags,
        githubUrl: version.githubUrl || null,
        externalUrl: version.externalUrl || null,
        language: version.language || null,
        readme: version.readme || null,
        filePath: version.filePath || null,
        fileUrl: version.fileUrl || null,
        fileSize: version.fileSize || null,
      },
    });

    logger.info(`Ressource ${resourceId} restaurée à la version ${versionNum}`, {
      userId: req.user.userId,
      backupVersion: backupVersionNumber,
    });

    res.json({
      message: `Ressource restaurée à la version ${versionNum}`,
      resource: {
        id: updatedResource.id,
        title: updatedResource.title,
        description: updatedResource.description,
        category: updatedResource.category,
        tags: updatedResource.tags,
        githubUrl: updatedResource.githubUrl,
        externalUrl: updatedResource.externalUrl,
        language: updatedResource.language,
        readme: updatedResource.readme,
        filePath: updatedResource.filePath,
        fileUrl: updatedResource.fileUrl,
        fileSize: updatedResource.fileSize,
        updatedAt: updatedResource.updatedAt,
      },
      restoredVersion: versionNum,
      backupVersion: backupVersionNumber,
    });
  })
);

/**
 * DELETE /api/resources/:resourceId/versions/:versionNumber
 * Supprime une version spécifique
 */
router.delete(
  '/:resourceId/versions/:versionNumber',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { resourceId, versionNumber } = req.params;
    const versionNum = parseInt(versionNumber, 10);

    if (isNaN(versionNum) || versionNum < 1) {
      throw new AppError('Numéro de version invalide', 400);
    }

    if (!req.user) {
      throw new AppError('Non authentifié', 401);
    }

    // Vérifier que la ressource existe et que l'utilisateur est propriétaire
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: { id: true, userId: true },
    });

    if (!resource) {
      throw new AppError('Ressource non trouvée', 404);
    }

    if (resource.userId !== req.user.userId) {
      throw new AppError('Seul le propriétaire peut supprimer une version', 403);
    }

    // Vérifier que la version existe
    const version = await prisma.resourceVersion.findUnique({
      where: {
        resourceId_versionNumber: {
          resourceId,
          versionNumber: versionNum,
        },
      },
    });

    if (!version) {
      throw new AppError('Version non trouvée', 404);
    }

    // Supprimer la version
    await prisma.resourceVersion.delete({
      where: {
        resourceId_versionNumber: {
          resourceId,
          versionNumber: versionNum,
        },
      },
    });

    logger.info(`Version ${versionNum} supprimée pour ressource ${resourceId}`, {
      userId: req.user.userId,
    });

    res.json({
      message: `Version ${versionNum} supprimée avec succès`,
    });
  })
);

export default router;

