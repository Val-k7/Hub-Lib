/**
 * Middleware Multer pour l'upload de fichiers
 */

import multer from 'multer';
import { fileStorageService } from '../services/fileStorageService.js';
import { AppError } from './errorHandler.js';

// Configuration de multer en mémoire
const storage = multer.memoryStorage();

// Filtre pour valider les types de fichiers
const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (fileStorageService.isAllowedMimeType(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`Type de fichier non autorisé: ${file.mimetype}`, 400));
  }
};

// Configuration de multer
const maxSizeMB = parseInt(process.env.FILE_MAX_SIZE_MB || '10', 10);
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxSizeMB * 1024 * 1024, // 10MB par défaut
  },
});

// Middleware pour gérer les erreurs d'upload
import { Request, Response, NextFunction } from 'express';

export const handleUploadError = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'Fichier trop volumineux',
        message: `La taille maximale autorisée est de ${process.env.FILE_MAX_SIZE_MB || 10}MB`,
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Trop de fichiers',
        message: 'Un seul fichier est autorisé par upload',
      });
    }
  }

  next(err);
};

