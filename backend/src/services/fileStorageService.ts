/**
 * Service de stockage de fichiers
 * Gère l'upload, le stockage et la récupération de fichiers
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export interface FileMetadata {
  id: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
  uploadedAt: Date;
  uploadedBy: string;
}

/**
 * Service de stockage de fichiers local
 * Peut être étendu pour supporter S3 ou d'autres services cloud
 */
class FileStorageService {
  private uploadDir: string;
  private maxFileSize: number; // en bytes
  private allowedMimeTypes: string[];

  constructor() {
    // Définir le répertoire d'upload
    this.uploadDir = env.FILE_UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.maxFileSize = (env.FILE_MAX_SIZE_MB || 10) * 1024 * 1024; // 10MB par défaut
    this.allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'text/plain',
      'text/markdown',
      'text/html',
      'application/json',
      'application/pdf',
      'application/zip',
      'application/x-zip-compressed',
    ];

    // Créer le répertoire d'upload s'il n'existe pas
    this.ensureUploadDirectory();
  }

  /**
   * Crée le répertoire d'upload s'il n'existe pas
   */
  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
      logger.info(`Répertoire d'upload créé: ${this.uploadDir}`);
    }
  }

  /**
   * Vérifie si un type MIME est autorisé
   */
  isAllowedMimeType(mimeType: string): boolean {
    // Vérifier les types exacts
    if (this.allowedMimeTypes.includes(mimeType)) {
      return true;
    }

    // Vérifier les types génériques (image/*, text/*, etc.)
    const genericTypes = ['image/', 'text/', 'application/'];
    return genericTypes.some((prefix) => mimeType.startsWith(prefix));
  }

  /**
   * Vérifie si la taille du fichier est acceptable
   */
  isFileSizeValid(size: number): boolean {
    return size <= this.maxFileSize;
  }

  /**
   * Génère un nom de fichier unique
   */
  private generateFileName(originalName: string): string {
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const timestamp = Date.now();
    const uuid = uuidv4().split('-')[0];
    return `${sanitizedBaseName}_${timestamp}_${uuid}${ext}`;
  }

  /**
   * Sauvegarde un fichier uploadé
   */
  async saveFile(
    file: Express.Multer.File,
    userId: string
  ): Promise<FileMetadata> {
    // Vérifier le type MIME
    if (!this.isAllowedMimeType(file.mimetype)) {
      throw new Error(`Type de fichier non autorisé: ${file.mimetype}`);
    }

    // Vérifier la taille
    if (!this.isFileSizeValid(file.size)) {
      throw new Error(
        `Fichier trop volumineux. Taille maximale: ${this.maxFileSize / 1024 / 1024}MB`
      );
    }

    // Générer un nom de fichier unique
    const fileName = this.generateFileName(file.originalname);
    const filePath = path.join(this.uploadDir, fileName);

    // Sauvegarder le fichier
    await fs.writeFile(filePath, file.buffer);

    // Créer les métadonnées
    const metadata: FileMetadata = {
      id: uuidv4(),
      originalName: file.originalname,
      fileName,
      mimeType: file.mimetype,
      size: file.size,
      path: filePath,
      url: `/api/files/${fileName}`,
      uploadedAt: new Date(),
      uploadedBy: userId,
    };

    logger.info(`Fichier sauvegardé: ${fileName}`, {
      originalName: file.originalname,
      size: file.size,
      userId,
    });

    return metadata;
  }

  /**
   * Récupère un fichier par son nom
   */
  async getFile(fileName: string): Promise<Buffer> {
    // Protection contre path traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      throw new Error('Nom de fichier invalide');
    }

    const filePath = path.join(this.uploadDir, fileName);

    try {
      const fileBuffer = await fs.readFile(filePath);
      return fileBuffer;
    } catch (error) {
      logger.error(`Erreur lors de la lecture du fichier: ${fileName}`, error);
      throw new Error('Fichier non trouvé');
    }
  }

  /**
   * Vérifie si un fichier existe
   */
  async fileExists(fileName: string): Promise<boolean> {
    // Protection contre path traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return false;
    }

    const filePath = path.join(this.uploadDir, fileName);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Supprime un fichier
   */
  async deleteFile(fileName: string): Promise<void> {
    // Protection contre path traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      throw new Error('Nom de fichier invalide');
    }

    const filePath = path.join(this.uploadDir, fileName);

    try {
      await fs.unlink(filePath);
      logger.info(`Fichier supprimé: ${fileName}`);
    } catch (error) {
      logger.error(`Erreur lors de la suppression du fichier: ${fileName}`, error);
      throw new Error('Impossible de supprimer le fichier');
    }
  }

  /**
   * Récupère les informations sur un fichier
   */
  async getFileInfo(fileName: string): Promise<{
    size: number;
    mimeType: string | null;
    createdAt: Date;
  }> {
    // Protection contre path traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      throw new Error('Nom de fichier invalide');
    }

    const filePath = path.join(this.uploadDir, fileName);

    try {
      const stats = await fs.stat(filePath);
      // Essayer de deviner le type MIME à partir de l'extension
      const ext = path.extname(fileName).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.html': 'text/html',
        '.json': 'application/json',
        '.pdf': 'application/pdf',
        '.zip': 'application/zip',
      };

      return {
        size: stats.size,
        mimeType: mimeTypes[ext] || null,
        createdAt: stats.birthtime,
      };
    } catch (error) {
      logger.error(`Erreur lors de la récupération des infos du fichier: ${fileName}`, error);
      throw new Error('Fichier non trouvé');
    }
  }
}

export const fileStorageService = new FileStorageService();

