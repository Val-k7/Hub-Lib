/**
 * Routes pour le partage vers GitHub
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { githubService } from '../services/githubService.js';
import { prisma } from '../config/database.js';
import { fileStorageService } from '../services/fileStorageService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);
router.use(generalRateLimit);

// Schémas de validation
const createRepositorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  private: z.boolean().optional().default(false),
  auto_init: z.boolean().optional().default(true),
  gitignore_template: z.string().optional(),
  license_template: z.string().optional(),
}).required({ name: true });

const shareResourceSchema = z.object({
  resourceId: z.string().uuid(),
  owner: z.string().min(1),
  repo: z.string().min(1),
  path: z.string().optional().default('README.md'),
  branch: z.string().optional().default('main'),
  createRepo: z.boolean().optional().default(false),
  repoDescription: z.string().optional(),
  repoPrivate: z.boolean().optional().default(false),
});

/**
 * @swagger
 * /api/github/user:
 *   get:
 *     summary: Récupère les informations de l'utilisateur GitHub
 *     tags: [GitHub]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informations de l'utilisateur GitHub
 *       404:
 *         description: Aucun compte GitHub lié
 */
router.get(
  '/user',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const userInfo = await githubService.getUserInfo(req.user.userId);
    res.json(userInfo);
  })
);

/**
 * @swagger
 * /api/github/repositories:
 *   get:
 *     summary: Liste les repositories GitHub de l'utilisateur
 *     tags: [GitHub]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [all, owner, member]
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [created, updated, pushed, full_name]
 *       - in: query
 *         name: direction
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Liste des repositories
 */
router.get(
  '/repositories',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { type, sort, direction } = req.query;
    const repositories = await githubService.listRepositories(req.user.userId, {
      type: type as 'all' | 'owner' | 'member' | undefined,
      sort: sort as 'created' | 'updated' | 'pushed' | 'full_name' | undefined,
      direction: direction as 'asc' | 'desc' | undefined,
    });

    res.json(repositories);
  })
);

/**
 * @swagger
 * /api/github/repositories:
 *   post:
 *     summary: Crée un nouveau repository GitHub
 *     tags: [GitHub]
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
 *               description:
 *                 type: string
 *               private:
 *                 type: boolean
 *               auto_init:
 *                 type: boolean
 *               gitignore_template:
 *                 type: string
 *               license_template:
 *                 type: string
 *     responses:
 *       201:
 *         description: Repository créé avec succès
 */
router.post(
  '/repositories',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const validatedData = createRepositorySchema.parse(req.body);
    const repository = await githubService.createRepository(req.user.userId, {
      name: validatedData.name,
      description: validatedData.description,
      private: validatedData.private,
      auto_init: validatedData.auto_init,
      gitignore_template: validatedData.gitignore_template,
      license_template: validatedData.license_template,
    });

    res.status(201).json(repository);
  })
);

/**
 * @swagger
 * /api/github/share-resource:
 *   post:
 *     summary: Partage une ressource vers GitHub
 *     tags: [GitHub]
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
 *               - owner
 *               - repo
 *             properties:
 *               resourceId:
 *                 type: string
 *                 format: uuid
 *               owner:
 *                 type: string
 *               repo:
 *                 type: string
 *               path:
 *                 type: string
 *               branch:
 *                 type: string
 *               createRepo:
 *                 type: boolean
 *               repoDescription:
 *                 type: string
 *               repoPrivate:
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
    const { resourceId, owner, repo, path, branch, createRepo, repoDescription, repoPrivate } = validatedData;

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

    // Créer le repository si nécessaire
    let finalOwner = owner;
    let finalRepo = repo;
    
    if (createRepo) {
      const userInfo = await githubService.getUserInfo(req.user.userId);
      finalOwner = userInfo.login;
      finalRepo = repo;

      // Vérifier si le repository existe déjà
      const exists = await githubService.repositoryExists(req.user.userId, finalOwner, finalRepo);
      if (!exists) {
        await githubService.createRepository(req.user.userId, {
          name: finalRepo,
          description: repoDescription || `Ressource: ${resource.title}`,
          private: repoPrivate,
          auto_init: true,
        });
      }
    }

    // Préparer le contenu à partager
    const files: Array<{ path: string; content: string | Buffer }> = [];

    // Créer le README.md avec les informations de la ressource
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
${resource.githubUrl ? `\n## Repository GitHub original\n\n${resource.githubUrl}` : ''}

---

*Partagé depuis [Hub-Lib](https://hublib.ovh)*
`;

    files.push({
      path: path || 'README.md',
      content: readmeContent,
    });

    // Si la ressource a un fichier, l'ajouter
    if (resource.filePath && resource.resourceType === 'file_upload') {
      try {
        const fileContent = await fileStorageService.getFile(resource.filePath);
        const fileName = resource.filePath.split('/').pop() || 'resource-file';
        
        // Récupérer le MIME type pour déterminer si c'est du texte ou binaire
        let fileInfo;
        try {
          fileInfo = await fileStorageService.getFileInfo(resource.filePath);
        } catch (error) {
          logger.warn('Impossible de récupérer les infos du fichier:', error);
        }
        
        // Si c'est un fichier texte, convertir en string, sinon garder en Buffer
        const isTextFile = fileInfo?.mimeType?.startsWith('text/') || 
                          fileInfo?.mimeType?.includes('json') ||
                          fileInfo?.mimeType?.includes('xml') ||
                          fileInfo?.mimeType?.includes('javascript') ||
                          fileInfo?.mimeType?.includes('css');
        
        files.push({
          path: fileName,
          content: isTextFile ? fileContent.toString('utf-8') : fileContent,
        });
      } catch (error) {
        logger.warn('Impossible de récupérer le fichier de la ressource:', error);
      }
    }

    // Partager les fichiers vers GitHub avec rollback en cas d'échec
    let result;
    let rollbackInfo: { baseCommitSha: string; createdFiles: string[] } | undefined;
    let previousCommitSha: string | undefined;
    
    try {
      // Récupérer le commit actuel pour rollback
      try {
        const ref = await githubService['githubRequest'](
          await githubService['getAccessToken'](req.user.userId),
          `/repos/${finalOwner}/${finalRepo}/git/ref/heads/${branch || 'main'}`
        );
        previousCommitSha = ref.object.sha;
      } catch (error) {
        logger.warn('Impossible de récupérer le commit actuel pour rollback:', error);
      }

      if (files.length === 1) {
        // Un seul fichier, utiliser l'API simple
        result = await githubService.createOrUpdateFile(
          req.user.userId,
          finalOwner,
          finalRepo,
          files[0].path,
          files[0].content,
          `Partage de la ressource: ${resource.title}`,
          branch
        );
      } else {
        // Plusieurs fichiers, utiliser l'API Git Data
        const multipleResult = await githubService.createMultipleFiles(
          req.user.userId,
          finalOwner,
          finalRepo,
          files,
          `Partage de la ressource: ${resource.title}`,
          branch
        );
        result = multipleResult;
        rollbackInfo = multipleResult.rollbackInfo;
      }
    } catch (error) {
      // En cas d'erreur, tenter le rollback si possible
      logger.error('Erreur lors du partage vers GitHub:', error);
      
      if (previousCommitSha) {
        try {
          logger.info(`Tentative de rollback vers le commit ${previousCommitSha}`);
          await githubService.rollbackCommit(
            req.user.userId,
            finalOwner,
            finalRepo,
            previousCommitSha,
            branch
          );
          logger.info('Rollback réussi');
        } catch (rollbackError) {
          logger.error('Échec du rollback:', rollbackError);
        }
      }
      
      throw error;
    }

    // Mettre à jour l'URL GitHub de la ressource si elle n'existe pas
    if (!resource.githubUrl) {
      await prisma.resource.update({
        where: { id: resourceId },
        data: {
          githubUrl: `https://github.com/${finalOwner}/${finalRepo}`,
        },
      });
    }

    res.json({
      success: true,
      repository: {
        owner: finalOwner,
        name: finalRepo,
        url: `https://github.com/${finalOwner}/${finalRepo}`,
      },
      commit: result.commit,
      files: files.map(f => f.path),
    });
  })
);

/**
 * @swagger
 * /api/github/repositories/{owner}/{repo}/exists:
 *   get:
 *     summary: Vérifie si un repository existe
 *     tags: [GitHub]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: owner
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: repo
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Statut d'existence du repository
 */
router.get(
  '/repositories/:owner/:repo/exists',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { owner, repo } = req.params;
    const exists = await githubService.repositoryExists(req.user.userId, owner, repo);

    res.json({ exists });
  })
);

export default router;

