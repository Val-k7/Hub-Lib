/**
 * Routes pour l'upload et la gestion de fichiers
 */

import express from 'express';
import { Request, Response } from 'express';
import { upload, handleUploadError } from '../middleware/upload.js';
import { authMiddleware } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { fileStorageService } from '../services/fileStorageService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/files/upload
 * Upload un fichier
 */
router.post(
  '/upload',
  authMiddleware,
  generalRateLimit,
  upload.single('file'),
  handleUploadError,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Non authentifié', 401);
    }

    if (!req.file) {
      throw new AppError('Aucun fichier fourni', 400);
    }

    // Sauvegarder le fichier
    const metadata = await fileStorageService.saveFile(req.file, req.user.userId);

    logger.info(`Fichier uploadé avec succès: ${metadata.fileName}`, {
      originalName: metadata.originalName,
      size: metadata.size,
      userId: req.user.userId,
    });

    res.status(201).json({
      success: true,
      file: {
        id: metadata.id,
        originalName: metadata.originalName,
        fileName: metadata.fileName,
        mimeType: metadata.mimeType,
        size: metadata.size,
        url: metadata.url,
        uploadedAt: metadata.uploadedAt,
      },
    });
  })
);

/**
 * GET /api/files/:fileName
 * Télécharge un fichier
 */
router.get(
  '/:fileName',
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { fileName } = req.params;

    // Sécuriser le nom de fichier (empêcher les path traversal)
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      throw new AppError('Nom de fichier invalide', 400);
    }

    // Vérifier que le fichier existe
    const exists = await fileStorageService.fileExists(fileName);
    if (!exists) {
      throw new AppError('Fichier non trouvé', 404);
    }

    // Récupérer les informations du fichier
    const fileInfo = await fileStorageService.getFileInfo(fileName);

    // Récupérer le fichier
    const fileBuffer = await fileStorageService.getFile(fileName);

    // Définir les headers
    res.setHeader('Content-Type', fileInfo.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Content-Length', fileInfo.size.toString());

    // Envoyer le fichier
    res.send(fileBuffer);
  })
);

/**
 * DELETE /api/files/:fileName
 * Supprime un fichier
 */
router.delete(
  '/:fileName',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Non authentifié', 401);
    }

    const { fileName } = req.params;

    // Sécuriser le nom de fichier
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      throw new AppError('Nom de fichier invalide', 400);
    }

    // Vérifier que le fichier existe
    const exists = await fileStorageService.fileExists(fileName);
    if (!exists) {
      throw new AppError('Fichier non trouvé', 404);
    }

    // Supprimer le fichier
    await fileStorageService.deleteFile(fileName);

    logger.info(`Fichier supprimé: ${fileName}`, {
      userId: req.user.userId,
    });

    res.json({
      success: true,
      message: 'Fichier supprimé avec succès',
    });
  })
);

/**
 * GET /api/files/:fileName/info
 * Récupère les informations sur un fichier
 */
router.get(
  '/:fileName/info',
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    const { fileName } = req.params;

    // Sécuriser le nom de fichier
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      throw new AppError('Nom de fichier invalide', 400);
    }

    // Vérifier que le fichier existe
    const exists = await fileStorageService.fileExists(fileName);
    if (!exists) {
      throw new AppError('Fichier non trouvé', 404);
    }

    // Récupérer les informations
    const fileInfo = await fileStorageService.getFileInfo(fileName);

    res.json({
      fileName,
      size: fileInfo.size,
      mimeType: fileInfo.mimeType,
      createdAt: fileInfo.createdAt,
      url: `/api/files/${fileName}`,
    });
  })
);

export default router;

