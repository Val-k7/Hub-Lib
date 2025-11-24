/**
 * Script de migration pour initialiser le système de permissions
 * 
 * Ce script :
 * 1. Crée les permissions de base
 * 2. Assigne les permissions aux rôles appropriés
 * 3. Migre les utilisateurs existants vers le nouveau système
 * 
 * Usage: npx tsx src/scripts/migratePermissions.ts
 */

import { PrismaClient, AppRole } from '@prisma/client';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

/**
 * Permissions de base à créer
 */
interface BasePermission {
  name: string;
  resource: string;
  action: string;
  description: string;
  roles: AppRole[]; // Rôles qui ont cette permission
}

const BASE_PERMISSIONS: BasePermission[] = [
  // ============================================================================
  // PERMISSIONS RESSOURCES
  // ============================================================================
  {
    name: 'resource:read',
    resource: 'resource',
    action: 'read',
    description: 'Lire les ressources publiques et partagées',
    roles: ['guest', 'user', 'moderator', 'admin', 'super_admin'],
  },
  {
    name: 'resource:write',
    resource: 'resource',
    action: 'write',
    description: 'Créer et modifier des ressources',
    roles: ['user', 'moderator', 'admin', 'super_admin'],
  },
  {
    name: 'resource:delete',
    resource: 'resource',
    action: 'delete',
    description: 'Supprimer des ressources (ses propres ressources ou toutes pour admin)',
    roles: ['user', 'moderator', 'admin', 'super_admin'],
  },
  {
    name: 'resource:share',
    resource: 'resource',
    action: 'share',
    description: 'Partager des ressources avec d\'autres utilisateurs',
    roles: ['user', 'moderator', 'admin', 'super_admin'],
  },
  {
    name: 'resource:rate',
    resource: 'resource',
    action: 'rate',
    description: 'Noter des ressources',
    roles: ['user', 'moderator', 'admin', 'super_admin'],
  },
  {
    name: 'resource:comment',
    resource: 'resource',
    action: 'comment',
    description: 'Commenter des ressources',
    roles: ['user', 'moderator', 'admin', 'super_admin'],
  },
  {
    name: 'resource:moderate',
    resource: 'resource',
    action: 'moderate',
    description: 'Modérer les ressources (modifier/supprimer n\'importe quelle ressource)',
    roles: ['moderator', 'admin', 'super_admin'],
  },

  // ============================================================================
  // PERMISSIONS TEMPLATES
  // ============================================================================
  {
    name: 'template:read',
    resource: 'template',
    action: 'read',
    description: 'Lire les templates publics',
    roles: ['guest', 'user', 'moderator', 'admin', 'super_admin'],
  },
  {
    name: 'template:write',
    resource: 'template',
    action: 'write',
    description: 'Créer et modifier des templates',
    roles: ['user', 'moderator', 'admin', 'super_admin'],
  },
  {
    name: 'template:delete',
    resource: 'template',
    action: 'delete',
    description: 'Supprimer des templates',
    roles: ['user', 'moderator', 'admin', 'super_admin'],
  },
  {
    name: 'template:moderate',
    resource: 'template',
    action: 'moderate',
    description: 'Modérer les templates',
    roles: ['moderator', 'admin', 'super_admin'],
  },

  // ============================================================================
  // PERMISSIONS SUGGESTIONS
  // ============================================================================
  {
    name: 'suggestion:read',
    resource: 'suggestion',
    action: 'read',
    description: 'Lire les suggestions',
    roles: ['user', 'moderator', 'admin', 'super_admin'],
  },
  {
    name: 'suggestion:write',
    resource: 'suggestion',
    action: 'write',
    description: 'Créer des suggestions',
    roles: ['user', 'moderator', 'admin', 'super_admin'],
  },
  {
    name: 'suggestion:vote',
    resource: 'suggestion',
    action: 'vote',
    description: 'Voter pour des suggestions',
    roles: ['user', 'moderator', 'admin', 'super_admin'],
  },
  {
    name: 'suggestion:approve',
    resource: 'suggestion',
    action: 'approve',
    description: 'Approuver des suggestions',
    roles: ['moderator', 'admin', 'super_admin'],
  },
  {
    name: 'suggestion:reject',
    resource: 'suggestion',
    action: 'reject',
    description: 'Rejeter des suggestions',
    roles: ['moderator', 'admin', 'super_admin'],
  },
  {
    name: 'suggestion:delete',
    resource: 'suggestion',
    action: 'delete',
    description: 'Supprimer des suggestions',
    roles: ['admin', 'super_admin'],
  },

  // ============================================================================
  // PERMISSIONS ADMINISTRATION
  // ============================================================================
  {
    name: 'admin:access',
    resource: 'admin',
    action: 'access',
    description: 'Accéder au panel d\'administration',
    roles: ['admin', 'super_admin'],
  },
  {
    name: 'admin:manage_users',
    resource: 'admin',
    action: 'manage_users',
    description: 'Gérer les utilisateurs (modifier, suspendre, supprimer)',
    roles: ['super_admin'],
  },
  {
    name: 'admin:manage_roles',
    resource: 'admin',
    action: 'manage_roles',
    description: 'Gérer les rôles et permissions',
    roles: ['super_admin'],
  },
  {
    name: 'admin:manage_config',
    resource: 'admin',
    action: 'manage_config',
    description: 'Gérer la configuration de l\'application',
    roles: ['super_admin'],
  },
  {
    name: 'admin:view_analytics',
    resource: 'admin',
    action: 'view_analytics',
    description: 'Voir les statistiques et analytics',
    roles: ['moderator', 'admin', 'super_admin'],
  },

  // ============================================================================
  // PERMISSIONS COLLECTIONS
  // ============================================================================
  {
    name: 'collection:read',
    resource: 'collection',
    action: 'read',
    description: 'Lire les collections publiques',
    roles: ['guest', 'user', 'moderator', 'admin', 'super_admin'],
  },
  {
    name: 'collection:write',
    resource: 'collection',
    action: 'write',
    description: 'Créer et modifier des collections',
    roles: ['user', 'moderator', 'admin', 'super_admin'],
  },
  {
    name: 'collection:delete',
    resource: 'collection',
    action: 'delete',
    description: 'Supprimer des collections',
    roles: ['user', 'moderator', 'admin', 'super_admin'],
  },

  // ============================================================================
  // PERMISSIONS FICHIERS
  // ============================================================================
  {
    name: 'file:upload',
    resource: 'file',
    action: 'upload',
    description: 'Uploader des fichiers',
    roles: ['user', 'moderator', 'admin', 'super_admin'],
  },
  {
    name: 'file:download',
    resource: 'file',
    action: 'download',
    description: 'Télécharger des fichiers',
    roles: ['user', 'moderator', 'admin', 'super_admin'],
  },
  {
    name: 'file:delete',
    resource: 'file',
    action: 'delete',
    description: 'Supprimer des fichiers',
    roles: ['user', 'moderator', 'admin', 'super_admin'],
  },
];

/**
 * Fonction principale de migration
 */
async function seedDemoData() {
  logger.info('🌱 Création des données de démonstration...');

  const demoUsers = [
    { email: 'demo-owner@hub-lib.dev', username: 'demoOwner', role: 'user' as AppRole },
    { email: 'demo-collab@hub-lib.dev', username: 'demoCollab', role: 'user' as AppRole },
    { email: 'demo-admin@hub-lib.dev', username: 'demoAdmin', role: 'admin' as AppRole },
  ];

  const createdUsers = [];
  for (const user of demoUsers) {
    const existing = await prisma.profile.findUnique({ where: { email: user.email } });
    if (existing) {
      createdUsers.push(existing);
      continue;
    }

    const profile = await prisma.profile.create({
      data: {
        userId: uuidv4(),
        email: user.email,
        username: user.username,
      },
    });

    await prisma.userRole.create({
      data: {
        userId: profile.userId,
        role: user.role,
      },
    });

    createdUsers.push(profile);
  }

  const owner = createdUsers[0];
  const collaborator = createdUsers[1];
  const admin = createdUsers[2];

  logger.info('👥 Utilisateurs de démo prêts');

  const existingGroup = await prisma.group.findFirst({
    where: { name: 'Equipe Demo' },
  });

  const demoGroup = existingGroup
    ? existingGroup
    : await prisma.group.create({
        data: {
          id: uuidv4(),
          name: 'Equipe Demo',
          description: 'Groupe de démonstration Hub-Lib',
          ownerId: owner.userId,
        },
      });

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: demoGroup.id, userId: collaborator.userId } },
    update: { role: 'member' },
    create: {
      id: uuidv4(),
      groupId: demoGroup.id,
      userId: collaborator.userId,
      role: 'member',
    },
  });

  logger.info('👥 Groupe de démo prêt');

  const existingResource = await prisma.resource.findFirst({
    where: { title: 'Guide Hub-Lib' },
  });

  const resource = existingResource
    ? existingResource
    : await prisma.resource.create({
        data: {
          id: uuidv4(),
          userId: owner.userId,
          title: 'Guide Hub-Lib',
          description: 'Ressource de démonstration pour présenter les fonctionnalités principales.',
          category: 'documentation',
          tags: ['guide', 'demo'],
          resourceType: 'external_link',
          visibility: 'shared_groups',
        },
      });

  const existingShare = await prisma.resourceShare.findFirst({
    where: {
      resourceId: resource.id,
      sharedWithGroupId: demoGroup.id,
      sharedWithUserId: null,
    },
  });

  if (!existingShare) {
    await prisma.resourceShare.create({
      data: {
        id: uuidv4(),
        resourceId: resource.id,
        sharedWithGroupId: demoGroup.id,
        permission: 'write',
      },
    });
  }

  await prisma.resourcePermission.createMany({
    data: [
      {
        id: uuidv4(),
        resourceId: resource.id,
        userId: collaborator.userId,
        permission: 'resource:update',
      },
      {
        id: uuidv4(),
        resourceId: resource.id,
        groupId: demoGroup.id,
        permission: 'resource:delete',
      },
    ],
    skipDuplicates: true,
  });

  logger.info('📚 Ressource de démo prête');

  const existingSuggestion = await prisma.categoryTagSuggestion.findFirst({
    where: { name: 'Dépôt GitHub' },
  });

  if (!existingSuggestion) {
    await prisma.categoryTagSuggestion.create({
      data: {
        id: uuidv4(),
        name: 'Dépôt GitHub',
        description: 'Proposer un modèle de dépôt GitHub préconfiguré.',
        type: 'resource_type',
        status: 'approved',
        suggestedBy: owner.userId,
      },
    });
  }

  logger.info('💡 Suggestions de démo prêtes');

  await prisma.analyticsEvent.createMany({
    data: [
      {
        id: uuidv4(),
        userId: owner.userId,
        event: 'resource_created',
        metadata: { resourceId: resource.id },
      },
      {
        id: uuidv4(),
        userId: collaborator.userId,
        event: 'resource_updated',
        metadata: { resourceId: resource.id },
      },
    ],
  });

  logger.info('📈 Événements de démo enregistrés');

  return { owner, collaborator, admin, resource, demoGroup };
}

async function migratePermissions() {
  try {
    logger.info('🚀 Début de la migration des permissions...');

    // 1. Créer les permissions
    logger.info('📝 Création des permissions de base...');
    let createdCount = 0;
    let skippedCount = 0;

    for (const perm of BASE_PERMISSIONS) {
      try {
        // Vérifier si la permission existe déjà
        const existing = await prisma.permission.findUnique({
          where: { name: perm.name },
        });

        if (existing) {
          logger.debug(`Permission "${perm.name}" existe déjà, ignorée`);
          skippedCount++;
          continue;
        }

        // Créer la permission
        await prisma.permission.create({
          data: {
            name: perm.name,
            resource: perm.resource,
            action: perm.action,
            description: perm.description,
          },
        });

        createdCount++;
        logger.debug(`✅ Permission créée: ${perm.name}`);
      } catch (error) {
        logger.error(`Erreur lors de la création de la permission "${perm.name}":`, error);
      }
    }

    logger.info(`✅ ${createdCount} permissions créées, ${skippedCount} ignorées`);

    // 2. Assigner les permissions aux rôles
    logger.info('🔗 Assignation des permissions aux rôles...');
    let assignedCount = 0;
    let alreadyAssignedCount = 0;

    for (const perm of BASE_PERMISSIONS) {
      const permission = await prisma.permission.findUnique({
        where: { name: perm.name },
      });

      if (!permission) {
        logger.warn(`Permission "${perm.name}" non trouvée, ignorée`);
        continue;
      }

      for (const role of perm.roles) {
        try {
          // Vérifier si l'association existe déjà
          const existing = await prisma.rolePermission.findFirst({
            where: {
              role,
              permissionId: permission.id,
            },
          });

          if (existing) {
            alreadyAssignedCount++;
            continue;
          }

          // Créer l'association
          await prisma.rolePermission.create({
            data: {
              role,
              permissionId: permission.id,
            },
          });

          assignedCount++;
        } catch (error) {
          // Ignorer les erreurs de contrainte unique
          if ((error as any).code !== 'P2002') {
            logger.error(`Erreur lors de l'assignation de "${perm.name}" au rôle "${role}":`, error);
          } else {
            alreadyAssignedCount++;
          }
        }
      }
    }

    logger.info(`✅ ${assignedCount} permissions assignées, ${alreadyAssignedCount} déjà assignées`);

    // 3. Vérifier que tous les utilisateurs ont un rôle
    logger.info('👥 Vérification des rôles utilisateurs...');
    const usersWithoutRole = await prisma.profile.findMany({
      where: {
        userRole: null,
      },
      select: {
        userId: true,
        email: true,
      },
    });

    if (usersWithoutRole.length > 0) {
      logger.warn(`⚠️  ${usersWithoutRole.length} utilisateurs sans rôle trouvés`);
      
      for (const user of usersWithoutRole) {
        try {
          await prisma.userRole.create({
            data: {
              userId: user.userId,
              role: 'user', // Rôle par défaut
            },
          });
          logger.info(`✅ Rôle "user" assigné à ${user.email}`);
        } catch (error) {
          logger.error(`Erreur lors de l'assignation du rôle à ${user.email}:`, error);
        }
      }
    } else {
      logger.info('✅ Tous les utilisateurs ont un rôle');
    }

    await seedDemoData();

    logger.info('✅ Migration des permissions terminée avec succès !');
  } catch (error) {
    logger.error('❌ Erreur lors de la migration des permissions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter la migration si le script est appelé directement
if (import.meta.url === `file://${process.argv[1]}`) {
  migratePermissions()
    .then(() => {
      logger.info('✅ Script terminé');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Erreur fatale:', error);
      process.exit(1);
    });
}

export { migratePermissions, BASE_PERMISSIONS };

