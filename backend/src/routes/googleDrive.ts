/**
 * Routes pour le partage vers Google Drive
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { googleDriveService } from '../services/googleDriveService.js';
import { prisma } from '../config/database.js';
import { fileStorageService } from '../services/fileStorageService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);
router.use(generalRateLimit);

// Schémas de validation
const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().optional(),
});

const shareResourceSchema = z.object({
  resourceId: z.string().uuid(),
  folderId: z.string().optional(),
  folderName: z.string().optional(),
  createFolder: z.boolean().optional().default(false),
  sharePublic: z.boolean().optional().default(false),
});

/**
 * @swagger
 * /api/google-drive/user:
 *   get:
 *     summary: Récupère les informations de l'utilisateur Google
 *     tags: [Google Drive]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informations de l'utilisateur Google
 *       404:
 *         description: Aucun compte Google lié
 */
router.get(
  '/user',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const userInfo = await googleDriveService.getUserInfo(req.user.userId);
    res.json(userInfo);
  })
);

/**
 * @swagger
 * /api/google-drive/folders:
 *   get:
 *     summary: Liste les dossiers Google Drive de l'utilisateur
 *     tags: [Google Drive]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: parentId
 *         schema:
 *           type: string
 *         description: ID du dossier parent
 *     responses:
 *       200:
 *         description: Liste des dossiers
 */
router.get(
  '/folders',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { parentId, pageToken, pageSize, useCache } = req.query;
    const result = await googleDriveService.listFolders(
      req.user.userId,
      parentId as string | undefined,
      {
        pageToken: pageToken as string | undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
        useCache: useCache === 'false' ? false : undefined,
      }
    );

    res.json(result);
  })
);

/**
 * @swagger
 * /api/google-drive/folders:
 *   post:
 *     summary: Crée un nouveau dossier Google Drive
 *     tags: [Google Drive]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               parentId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Dossier créé avec succès
 */
router.post(
  '/folders',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const validatedData = createFolderSchema.parse(req.body);
    const folder = await googleDriveService.createFolder(req.user.userId, {
      name: validatedData.name,
      parentId: validatedData.parentId,
    });

    res.status(201).json(folder);
  })
);

/**
 * @swagger
 * /api/google-drive/share-resource:
 *   post:
 *     summary: Partage une ressource vers Google Drive
 *     tags: [Google Drive]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resourceId
 *             properties:
 *               resourceId:
 *                 type: string
 *                 format: uuid
 *               folderId:
 *                 type: string
 *               folderName:
 *                 type: string
 *               createFolder:
 *                 type: boolean
 *               sharePublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Ressource partagée avec succès
 */
router.post(
  '/share-resource',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const validatedData = shareResourceSchema.parse(req.body);
    const { resourceId, folderId, folderName, createFolder, sharePublic } = validatedData;
    
    // Variables pour le rollback
    let createdFolderId: string | undefined;
    const createdFileIds: string[] = [];
    
    try {
      // Récupérer la ressource
      const resource = await prisma.resource.findUnique({
        where: { id: resourceId },
      });

      if (!resource) {
        throw new AppError('Ressource non trouvée', 404, 'RESOURCE_NOT_FOUND');
      }

      // Vérifier que l'utilisateur est propriétaire de la ressource
      if (resource.userId !== req.user.userId) {
        throw new AppError('Vous n\'êtes pas autorisé à partager cette ressource', 403, 'FORBIDDEN');
      }

      // Créer le dossier si nécessaire
      let finalFolderId = folderId;
      
      if (createFolder && folderName) {
        const newFolder = await googleDriveService.createFolder(req.user.userId, {
          name: folderName,
          parentId: folderId,
        });
        finalFolderId = newFolder.id;
        createdFolderId = newFolder.id;
      }

    // Préparer le contenu à partager
    const readmeContent = `# ${resource.title}

${resource.description}

${resource.readme ? `\n## Description détaillée\n\n${resource.readme}` : ''}

## Informations

- **Catégorie**: ${resource.category || 'Non spécifiée'}
- **Tags**: ${resource.tags.length > 0 ? resource.tags.join(', ') : 'Aucun'}
- **Type**: ${resource.resourceType}
- **Langage**: ${resource.language || 'Non spécifié'}
- **Licence**: ${resource.license || 'Non spécifiée'}

${resource.externalUrl ? `\n## Lien externe\n\n${resource.externalUrl}` : ''}
${resource.githubUrl ? `\n## Repository GitHub\n\n${resource.githubUrl}` : ''}

---

*Partagé depuis [Hub-Lib](https://hublib.ovh)*
`;

      // Créer le fichier README dans Google Drive avec rollback en cas d'échec
      let readmeFile;
      const files: Array<{ id: string; name: string; webViewLink?: string }> = [];
      
      readmeFile = await googleDriveService.createTextFile(
        req.user.userId,
        `${resource.title} - README.txt`,
        readmeContent,
        finalFolderId
      );
      files.push(readmeFile);
      createdFileIds.push(readmeFile.id);

      // Si la ressource a un fichier, le téléverser aussi
      if (resource.filePath && resource.resourceType === 'file_upload') {
        try {
          const fileContent = await fileStorageService.getFile(resource.filePath);
          const fileName = resource.filePath.split('/').pop() || 'resource-file';
          
          // Récupérer le MIME type depuis le service de stockage
          let mimeType = 'application/octet-stream';
          try {
            const fileInfo = await fileStorageService.getFileInfo(resource.filePath);
            mimeType = fileInfo.mimeType || 'application/octet-stream';
          } catch (error) {
            logger.warn('Impossible de récupérer le MIME type, utilisation du type par défaut:', error);
          }
          
          const uploadedFile = await googleDriveService.uploadFile(req.user.userId, {
            name: fileName,
            content: fileContent,
            mimeType,
            parentId: finalFolderId,
            description: `Fichier de la ressource: ${resource.title}`,
          });

          files.push(uploadedFile);
          createdFileIds.push(uploadedFile.id);
        } catch (error) {
          logger.warn('Impossible de téléverser le fichier de la ressource:', error);
          // Si le fichier échoue, on continue quand même (le README est créé)
          // Mais on marque l'opération comme partiellement réussie
        }
      }

      // Partager les fichiers publiquement si demandé
      if (sharePublic) {
        for (const file of files) {
          try {
            await googleDriveService.shareFile(req.user.userId, file.id, 'reader');
          } catch (error) {
            logger.warn(`Impossible de partager le fichier ${file.id}:`, error);
            // En cas d'erreur de partage, supprimer le fichier créé pour rollback
            try {
              await googleDriveService.deleteFile(req.user.userId, file.id);
              const index = createdFileIds.indexOf(file.id);
              if (index > -1) createdFileIds.splice(index, 1);
              const fileIndex = files.findIndex(f => f.id === file.id);
              if (fileIndex > -1) files.splice(fileIndex, 1);
            } catch (deleteError) {
              logger.error(`Impossible de supprimer le fichier ${file.id} après échec de partage:`, deleteError);
            }
          }
        }
      }
      
      // Retourner la réponse
      res.json({
        success: true,
        folder: finalFolderId ? {
          id: finalFolderId,
        } : null,
        files: files.map(f => ({
          id: f.id,
          name: f.name,
          url: f.webViewLink,
        })),
      });
    } catch (error) {
      // Rollback : supprimer tous les fichiers créés
      logger.error('Erreur lors du partage vers Google Drive, rollback en cours:', error);
      
      for (const fileId of createdFileIds) {
        try {
          await googleDriveService.deleteFile(req.user.userId, fileId);
          logger.info(`Fichier ${fileId} supprimé lors du rollback`);
        } catch (deleteError) {
          logger.error(`Impossible de supprimer le fichier ${fileId} lors du rollback:`, deleteError);
        }
      }
      
      // Supprimer le dossier créé si nécessaire
      if (createdFolderId) {
        try {
          await googleDriveService.deleteFile(req.user.userId, createdFolderId);
          logger.info(`Dossier ${createdFolderId} supprimé lors du rollback`);
        } catch (deleteError) {
          logger.error(`Impossible de supprimer le dossier ${createdFolderId} lors du rollback:`, deleteError);
        }
      }
      
      throw error;
    }
  })
);

export default router;

