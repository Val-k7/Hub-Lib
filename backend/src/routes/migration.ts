/**
 * Routes pour la migration des données
 * Permet d'importer les données depuis localStorage vers PostgreSQL
 */

import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const router = Router();

// Seuls les admins peuvent importer des données
router.use(authMiddleware);
router.use(requireRole('admin'));

/**
 * Schéma de validation pour l'import
 */
const ImportSchema = z.object({
  metadata: z.object({
    exportDate: z.string(),
    exportVersion: z.string().optional(),
  }),
  tables: z.record(z.array(z.any())),
  auth: z.any().optional(),
  authData: z.array(z.any()).optional(),
  analytics: z.array(z.any()).optional(),
});

/**
 * Mapping des noms de tables localStorage vers Prisma
 */
const TABLE_MAPPING: Record<string, string> = {
  profiles: 'profile',
  resources: 'resource',
  saved_resources: 'savedResource',
  resource_ratings: 'resourceRating',
  resource_shares: 'resourceShare',
  resource_comments: 'resourceComment',
  groups: 'group',
  group_members: 'groupMember',
  notifications: 'notification',
  category_tag_suggestions: 'categoryTagSuggestion',
  suggestion_votes: 'suggestionVote',
  user_roles: 'userRole',
  resource_templates: 'resourceTemplate',
  collections: 'collection',
  collection_resources: 'collectionResource',
  admin_config: 'adminConfig',
  resource_versions: 'resourceVersion',
};

/**
 * Convertit un ID string en UUID
 */
function toUUID(id: string | undefined): string {
  if (!id) return randomUUID();
  
  // Si c'est déjà un UUID valide, le retourner
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) {
    return id;
  }
  
  // Sinon, générer un UUID basé sur l'ID (déterministe)
  // Utiliser un hash simple pour générer un UUID v4 valide
  return randomUUID(); // Pour l'instant, générer un nouveau UUID
}

/**
 * Convertit un timestamp string en Date
 */
function toDate(timestamp: string | undefined): Date {
  if (!timestamp) return new Date();
  return new Date(timestamp);
}

/**
 * Nettoie et convertit les données d'une table
 */
function cleanTableData(tableName: string, data: any[]): any[] {
  const prismaModel = TABLE_MAPPING[tableName];
  if (!prismaModel) {
    logger.warn(`Table non mappée: ${tableName}`);
    return [];
  }

  return data.map((row) => {
    const cleaned: any = {};

    // Mapping des champs selon le modèle
    switch (prismaModel) {
      case 'profile':
        return {
          id: toUUID(row.id),
          userId: toUUID(row.user_id || row.id),
          email: row.email || '',
          username: row.username || null,
          fullName: row.full_name || null,
          bio: row.bio || null,
          avatarUrl: row.avatar_url || null,
          githubUsername: row.github_username || null,
          preferredLayout: row.preferred_layout || null,
          createdAt: toDate(row.created_at),
          updatedAt: toDate(row.updated_at || row.created_at),
        };

      case 'resource':
        return {
          id: toUUID(row.id),
          userId: toUUID(row.user_id),
          title: row.title || '',
          description: row.description || '',
          category: row.category || null,
          tags: Array.isArray(row.tags) ? row.tags : [],
          resourceType: row.resource_type || 'external_link',
          visibility: row.visibility || 'public',
          githubUrl: row.github_url || null,
          externalUrl: row.external_url || null,
          filePath: row.file_path || null,
          fileUrl: row.file_url || null,
          fileSize: row.file_size || null,
          language: row.language || null,
          license: row.license || null,
          readme: row.readme || null,
          averageRating: row.average_rating ? parseFloat(row.average_rating) : 0,
          ratingsCount: row.ratings_count || 0,
          downloadsCount: row.downloads_count || 0,
          viewsCount: row.views_count || 0,
          createdAt: toDate(row.created_at),
          updatedAt: toDate(row.updated_at || row.created_at),
        };

      case 'collection':
        return {
          id: toUUID(row.id),
          userId: toUUID(row.user_id),
          name: row.name || '',
          description: row.description || null,
          isPublic: row.is_public || false,
          coverImageUrl: row.cover_image_url || null,
          resourcesCount: row.resources_count || 0,
          createdAt: toDate(row.created_at),
          updatedAt: toDate(row.updated_at || row.created_at),
        };

      case 'collectionResource':
        return {
          id: toUUID(row.id),
          collectionId: toUUID(row.collection_id),
          resourceId: toUUID(row.resource_id),
          addedAt: toDate(row.added_at || row.created_at),
          orderIndex: row.order || row.order_index || 0,
        };

      case 'resourceComment':
        return {
          id: toUUID(row.id),
          resourceId: toUUID(row.resource_id),
          userId: toUUID(row.user_id),
          content: row.content || '',
          createdAt: toDate(row.created_at),
          updatedAt: toDate(row.updated_at || row.created_at),
        };

      case 'notification':
        return {
          id: toUUID(row.id),
          userId: toUUID(row.user_id),
          type: row.type || 'info',
          title: row.title || '',
          message: row.message || '',
          resourceId: row.resource_id ? toUUID(row.resource_id) : null,
          groupId: row.group_id ? toUUID(row.group_id) : null,
          isRead: row.is_read || false,
          createdAt: toDate(row.created_at),
        };

      // Ajouter d'autres mappings selon les besoins
      default:
        logger.warn(`Mapping non défini pour ${prismaModel}, utilisation des données brutes`);
        return row;
    }
  });
}

/**
 * POST /api/migration/import
 * Importe les données depuis un export localStorage
 */
router.post('/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const importData = ImportSchema.parse(req.body);
    const results = {
      success: true,
      imported: {} as Record<string, number>,
      errors: [] as string[],
      warnings: [] as string[],
    };

    logger.info('Début de l\'import des données...');

    // Ordre d'import important (respecter les dépendances FK)
    const importOrder = [
      'profiles',
      'user_roles',
      'resources',
      'collections',
      'collection_resources',
      'saved_resources',
      'resource_ratings',
      'resource_shares',
      'resource_comments',
      'groups',
      'group_members',
      'notifications',
      'category_tag_suggestions',
      'suggestion_votes',
      'resource_templates',
      'admin_config',
      'resource_versions',
    ];

    // Importer dans une transaction
    await prisma.$transaction(async (tx) => {
      for (const tableName of importOrder) {
        const data = importData.tables[tableName] || [];
        if (data.length === 0) {
          logger.info(`Table "${tableName}" vide, ignorée`);
          continue;
        }

        const prismaModel = TABLE_MAPPING[tableName];
        if (!prismaModel) {
          results.warnings.push(`Table "${tableName}" non mappée, ignorée`);
          continue;
        }

        try {
          const cleanedData = cleanTableData(tableName, data);
          
          // Utiliser createMany avec skipDuplicates pour éviter les doublons
          const model = (tx as any)[prismaModel];
          if (!model) {
            results.warnings.push(`Modèle Prisma "${prismaModel}" non trouvé`);
            continue;
          }

          // Importer par batch de 100 pour éviter les timeouts
          const batchSize = 100;
          let imported = 0;
          let skipped = 0;

          for (let i = 0; i < cleanedData.length; i += batchSize) {
            const batch = cleanedData.slice(i, i + batchSize);
            try {
              const result = await model.createMany({
                data: batch,
                skipDuplicates: true,
              });
              imported += result.count || batch.length;
              skipped += batch.length - (result.count || batch.length);
            } catch (error: any) {
              // Si createMany échoue, essayer un par un pour identifier les problèmes
              logger.warn(`Erreur batch pour ${tableName}, import un par un:`, error.message);
              for (const item of batch) {
                try {
                  await model.create({
                    data: item,
                  });
                  imported++;
                } catch (itemError: any) {
                  skipped++;
                  // Si c'est un doublon, on l'ignore silencieusement
                  if (!itemError.message?.includes('Unique constraint')) {
                    results.warnings.push(`Erreur pour ${tableName}[${item.id}]: ${itemError.message}`);
                  }
                }
              }
            }
          }

          if (skipped > 0) {
            results.warnings.push(`${skipped} enregistrements ignorés (doublons) pour ${tableName}`);
          }

          results.imported[tableName] = imported;
          logger.info(`Table "${tableName}" importée: ${imported}/${data.length} enregistrements`);
        } catch (error: any) {
          const errorMsg = `Erreur lors de l'import de "${tableName}": ${error.message}`;
          results.errors.push(errorMsg);
          logger.error(errorMsg, error);
        }
      }
    });

    // Statistiques finales
    const totalImported = Object.values(results.imported).reduce((sum, count) => sum + count, 0);

    logger.info(`Import terminé: ${totalImported} enregistrements importés`);
    logger.info(`Erreurs: ${results.errors.length}, Avertissements: ${results.warnings.length}`);

    res.status(200).json({
      ...results,
      summary: {
        totalImported,
        tablesImported: Object.keys(results.imported).length,
        errors: results.errors.length,
        warnings: results.warnings.length,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors,
      });
    }

    logger.error('Erreur lors de l\'import:', error);
    next(error);
  }
});

/**
 * GET /api/migration/validate
 * Valide les données avant import (dry-run)
 */
router.post('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const importData = ImportSchema.parse(req.body);
    const validation = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      statistics: {} as Record<string, any>,
    };

    // Valider l'intégrité des données
    for (const [tableName, data] of Object.entries(importData.tables)) {
      if (!Array.isArray(data)) {
        validation.errors.push(`Table "${tableName}" n'est pas un tableau`);
        continue;
      }

      const prismaModel = TABLE_MAPPING[tableName];
      if (!prismaModel) {
        validation.warnings.push(`Table "${tableName}" non mappée`);
        continue;
      }

      validation.statistics[tableName] = {
        count: data.length,
        hasIds: data.every((row: any) => row.id),
      };

      // Validation spécifique par table
      if (tableName === 'resources') {
        const missingUserIds = data.filter((row: any) => !row.user_id);
        if (missingUserIds.length > 0) {
          validation.warnings.push(`${missingUserIds.length} ressources sans user_id`);
        }
        
        // Vérifier que les user_id référencent des profils existants
        if (importData.tables.profiles) {
          const existingUserIds = new Set(importData.tables.profiles.map((p: any) => p.id));
          const invalidUserIds = data.filter((row: any) => row.user_id && !existingUserIds.has(row.user_id));
          if (invalidUserIds.length > 0) {
            validation.warnings.push(`${invalidUserIds.length} ressources avec user_id invalide`);
          }
        }
      }

      if (tableName === 'profiles') {
        const missingEmails = data.filter((row: any) => !row.email);
        if (missingEmails.length > 0) {
          validation.errors.push(`${missingEmails.length} profils sans email`);
        }
        
        // Vérifier les emails dupliqués
        const emails = data.map((row: any) => row.email).filter(Boolean);
        const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index);
        if (duplicateEmails.length > 0) {
          validation.warnings.push(`${duplicateEmails.length} emails dupliqués détectés`);
        }
      }

      if (tableName === 'collection_resources') {
        // Vérifier que les collections et ressources référencées existent
        if (importData.tables.collections && importData.tables.resources) {
          const existingCollectionIds = new Set(importData.tables.collections.map((c: any) => c.id));
          const existingResourceIds = new Set(importData.tables.resources.map((r: any) => r.id));
          
          const invalidCollections = data.filter((row: any) => 
            row.collection_id && !existingCollectionIds.has(row.collection_id)
          );
          const invalidResources = data.filter((row: any) => 
            row.resource_id && !existingResourceIds.has(row.resource_id)
          );
          
          if (invalidCollections.length > 0) {
            validation.warnings.push(`${invalidCollections.length} collection_resources avec collection_id invalide`);
          }
          if (invalidResources.length > 0) {
            validation.warnings.push(`${invalidResources.length} collection_resources avec resource_id invalide`);
          }
        }
      }
    }

    validation.valid = validation.errors.length === 0;

    res.json(validation);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Données invalides',
        details: error.errors,
      });
    }

    next(error);
  }
});

export default router;

