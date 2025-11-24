/**
 * Configuration Swagger/OpenAPI pour la documentation API
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hub-Lib API',
      version: '1.0.0',
      description: 'API REST pour Hub-Lib - Plateforme de partage de ressources et de connaissances',
      contact: {
        name: 'Hub-Lib Support',
        email: 'support@hub-lib.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: env.API_BASE_URL,
        description: 'Serveur de production',
      },
      {
        url: 'http://localhost:3001',
        description: 'Serveur de développement local',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtenu via /api/auth/signin ou /api/auth/signup',
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Token API obtenu via /api/api-tokens',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Message d\'erreur',
            },
            code: {
              type: 'string',
              description: 'Code d\'erreur',
            },
            details: {
              type: 'object',
              description: 'Détails supplémentaires de l\'erreur',
            },
          },
        },
        Resource: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID unique de la ressource',
            },
            title: {
              type: 'string',
              description: 'Titre de la ressource',
            },
            description: {
              type: 'string',
              description: 'Description de la ressource',
            },
            category: {
              type: 'string',
              description: 'Catégorie de la ressource',
            },
            tags: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Tags associés à la ressource',
            },
            resource_type: {
              type: 'string',
              enum: ['file_upload', 'external_link', 'github_repo'],
              description: 'Type de ressource',
            },
            visibility: {
              type: 'string',
              enum: ['public', 'private', 'shared_users', 'shared_groups'],
              description: 'Visibilité de la ressource',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'ID de l\'utilisateur propriétaire',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date de création',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date de mise à jour',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'ID unique de l\'utilisateur',
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email de l\'utilisateur',
            },
            username: {
              type: 'string',
              description: 'Nom d\'utilisateur',
            },
            role: {
              type: 'string',
              enum: ['user', 'admin', 'moderator'],
              description: 'Rôle de l\'utilisateur',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Date de création',
            },
          },
        },
      },
    },
    tags: [
      {
        name: 'Auth',
        description: 'Endpoints d\'authentification et de gestion de session',
      },
      {
        name: 'Resources',
        description: 'Gestion des ressources (CRUD, partage, versions)',
      },
      {
        name: 'Profiles',
        description: 'Gestion des profils utilisateur',
      },
      {
        name: 'Collections',
        description: 'Gestion des collections de ressources',
      },
      {
        name: 'Comments',
        description: 'Gestion des commentaires sur les ressources',
      },
      {
        name: 'Groups',
        description: 'Gestion des groupes et espaces de travail',
      },
      {
        name: 'Notifications',
        description: 'Gestion des notifications',
      },
      {
        name: 'Admin',
        description: 'Endpoints d\'administration (nécessite le rôle admin)',
      },
      {
        name: 'Suggestions',
        description: 'Gestion des suggestions de catégories et tags',
      },
      {
        name: 'Analytics',
        description: 'Statistiques et analytics',
      },
      {
        name: 'Categories',
        description: 'Gestion de la hiérarchie de catégories et filtres',
      },
      {
        name: 'Files',
        description: 'Upload et gestion de fichiers',
      },
      {
        name: 'API Tokens',
        description: 'Gestion des tokens API pour l\'accès externe',
      },
      {
        name: 'Backups',
        description: 'Gestion des backups de la base de données',
      },
      {
        name: 'Monitoring',
        description: 'Monitoring et métriques de l\'application',
      },
      {
        name: 'Migration',
        description: 'Migration des données depuis localStorage',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/server.ts',
  ],
};

export const swaggerSpec = swaggerJsdoc(options);

