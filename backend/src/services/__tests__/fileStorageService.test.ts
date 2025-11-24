/**
 * Tests d'intégration pour fileStorageService
 * Utilise de vrais fichiers système
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fileStorageService } from '../fileStorageService.js';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Le service utilise le répertoire défini dans env ou le répertoire par défaut
const getUploadDir = () => {
  return process.env.FILE_UPLOAD_DIR || path.join(process.cwd(), 'uploads');
};

describe('fileStorageService', () => {
  const mockFile = {
    buffer: Buffer.from('test file content'),
    originalname: 'test.txt',
    mimetype: 'text/plain',
    size: 1024,
  } as Express.Multer.File;

  let uploadedFiles: string[] = [];

  beforeEach(async () => {
    // S'assurer que le répertoire d'upload existe
    const uploadDir = getUploadDir();
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      // Le répertoire existe déjà
    }
    uploadedFiles = [];
  });

  afterEach(async () => {
    // Nettoyer uniquement les fichiers créés pendant les tests
    const uploadDir = getUploadDir();
    for (const fileName of uploadedFiles) {
      try {
        await fs.unlink(path.join(uploadDir, fileName));
      } catch (error) {
        // Ignorer les erreurs de nettoyage
      }
    }
    uploadedFiles = [];
  });

  describe('saveFile', () => {
    it('devrait sauvegarder un fichier avec succès', async () => {
      const userId = 'user-123';

      const result = await fileStorageService.saveFile(mockFile, userId);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('fileName');
      expect(result).toHaveProperty('originalName', 'test.txt');
      expect(result).toHaveProperty('mimeType', 'text/plain');
      expect(result).toHaveProperty('size', 1024);
      expect(result).toHaveProperty('url');
      
      // Vérifier que le fichier existe réellement
      // Le service utilise env.FILE_UPLOAD_DIR ou le répertoire par défaut
      const uploadDir = process.env.FILE_UPLOAD_DIR || path.join(process.cwd(), 'uploads');
      const filePath = path.join(uploadDir, result.fileName);
      const exists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });

    it('devrait générer un nom de fichier unique', async () => {
      const userId = 'user-123';

      const result1 = await fileStorageService.saveFile(mockFile, userId);
      uploadedFiles.push(result1.fileName);
      // Attendre un peu pour avoir un timestamp différent
      await new Promise(resolve => setTimeout(resolve, 10));
      const result2 = await fileStorageService.saveFile(mockFile, userId);
      uploadedFiles.push(result2.fileName);

      expect(result1.fileName).not.toBe(result2.fileName);
    });

    it('devrait rejeter les fichiers trop volumineux', async () => {
      const largeFile = {
        ...mockFile,
        size: 11 * 1024 * 1024, // 11 MB
      } as Express.Multer.File;

      await expect(fileStorageService.saveFile(largeFile, 'user-123')).rejects.toThrow();
    });

    it('devrait rejeter les types MIME non autorisés', async () => {
      const invalidFile = {
        ...mockFile,
        mimetype: 'video/mp4', // Type vidéo non autorisé
      } as Express.Multer.File;

      await expect(fileStorageService.saveFile(invalidFile, 'user-123')).rejects.toThrow();
    });
  });

  describe('getFile', () => {
    it('devrait récupérer un fichier existant', async () => {
      const userId = 'user-123';
      
      // Sauvegarder un fichier d'abord
      const saved = await fileStorageService.saveFile(mockFile, userId);
      uploadedFiles.push(saved.fileName);
      const fileName = saved.fileName;

      const result = await fileStorageService.getFile(fileName);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('test file content');
    });

    it('devrait rejeter les noms de fichier avec path traversal', async () => {
      const maliciousFileName = '../../../etc/passwd';

      await expect(fileStorageService.getFile(maliciousFileName)).rejects.toThrow();
    });
  });

  describe('deleteFile', () => {
    it('devrait supprimer un fichier existant', async () => {
      const userId = 'user-123';
      
      // Sauvegarder un fichier d'abord
      const saved = await fileStorageService.saveFile(mockFile, userId);
      uploadedFiles.push(saved.fileName);
      const fileName = saved.fileName;

      // Vérifier que le fichier existe
      const existsBefore = await fileStorageService.fileExists(fileName);
      expect(existsBefore).toBe(true);

      await fileStorageService.deleteFile(fileName);

      // Vérifier que le fichier n'existe plus
      const existsAfter = await fileStorageService.fileExists(fileName);
      expect(existsAfter).toBe(false);
    });

    it('devrait rejeter les noms de fichier avec path traversal', async () => {
      const maliciousFileName = '../../../etc/passwd';

      await expect(fileStorageService.deleteFile(maliciousFileName)).rejects.toThrow();
    });
  });

  describe('fileExists', () => {
    it('devrait retourner true si le fichier existe', async () => {
      const userId = 'user-123';
      
      // Sauvegarder un fichier d'abord
      const saved = await fileStorageService.saveFile(mockFile, userId);
      uploadedFiles.push(saved.fileName);
      const fileName = saved.fileName;

      const result = await fileStorageService.fileExists(fileName);

      expect(result).toBe(true);
    });

    it('devrait retourner false si le fichier n\'existe pas', async () => {
      const fileName = 'nonexistent-' + uuidv4() + '.txt';

      const result = await fileStorageService.fileExists(fileName);

      expect(result).toBe(false);
    });
  });

  describe('getFileInfo', () => {
    it('devrait retourner les informations d\'un fichier', async () => {
      const userId = 'user-123';
      
      // Sauvegarder un fichier d'abord
      const saved = await fileStorageService.saveFile(mockFile, userId);
      uploadedFiles.push(saved.fileName);
      const fileName = saved.fileName;

      const result = await fileStorageService.getFileInfo(fileName);

      // La taille réelle du fichier est celle du buffer, pas celle déclarée dans mockFile
      expect(result).toHaveProperty('size');
      expect(result.size).toBeGreaterThan(0);
      expect(result).toHaveProperty('mimeType');
      expect(result).toHaveProperty('createdAt');
    });
  });
});
