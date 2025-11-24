/**
 * Routes pour la gestion des permissions
 * 
 * Permet aux administrateurs de gérer les permissions et rôles
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { permissionService } from '../services/permissionService.js';
import { permissionAuditService } from '../services/permissionAuditService.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { strictRateLimit } from '../middleware/rateLimit.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Toutes les routes nécessitent l'authentification
router.use(authMiddleware);
router.use(strictRateLimit);

// Schémas de validation
const createPermissionSchema = z.object({
  name: z.string().min(3).max(100),
  resource: z.string().min(1).max(50),
  action: z.string().min(1).max(50),
  description: z.string().optional(),
});

const assignPermissionSchema = z.object({
  role: z.enum(['super_admin', 'admin', 'moderator', 'user', 'guest']),
  permissionId: z.string().uuid(),
});

const auditQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  action: z
    .enum(['PERMISSION_CREATED', 'PERMISSION_UPDATED', 'PERMISSION_DELETED', 'PERMISSION_ASSIGNED', 'PERMISSION_REVOKED'])
    .optional(),
  targetRole: z.enum(['super_admin', 'admin', 'moderator', 'user', 'guest']).optional(),
  actorUserId: z.string().uuid().optional(),
});

/**
 * GET /api/permissions
 * Liste toutes les permissions disponibles
 */
router.get(
  '/',
  requireRole('admin'),
  asyncHandler(async (_req: Request, res: Response) => {
    const permissions = await prisma.permission.findMany({
      orderBy: [
        { resource: 'asc' },
        { action: 'asc' },
      ],
      include: {
        rolePermissions: {
          select: {
            role: true,
            id: true,
          },
        },
      },
    });

    res.json({
      data: permissions.map((perm) => ({
        id: perm.id,
        name: perm.name,
        resource: perm.resource,
        action: perm.action,
        description: perm.description,
        roles: perm.rolePermissions.map((rp) => ({
          role: rp.role,
          rolePermissionId: rp.id,
        })),
      })),
    });
  })
);

/**
 * GET /api/permissions/:id
 * Récupère une permission spécifique
 */
router.get(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const permission = await prisma.permission.findUnique({
      where: { id: req.params.id },
      include: {
        rolePermissions: {
          select: {
            role: true,
        id: true,
          },
        },
      },
    });

    if (!permission) {
      throw new AppError('Permission non trouvée', 404);
    }

    res.json({
      data: {
        id: permission.id,
        name: permission.name,
        resource: permission.resource,
        action: permission.action,
        description: permission.description,
      roles: permission.rolePermissions.map((rp) => ({
        role: rp.role,
        rolePermissionId: rp.id,
      })),
      },
    });
  })
);

/**
 * POST /api/permissions
 * Crée une nouvelle permission (super_admin uniquement)
 */
router.post(
  '/',
  requireRole('super_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const data = createPermissionSchema.parse(req.body);

    // Vérifier si la permission existe déjà
    const existing = await prisma.permission.findUnique({
      where: { name: data.name },
    });

    if (existing) {
      throw new AppError('Cette permission existe déjà', 409);
    }

    const permission = await prisma.permission.create({
      data: {
        name: data.name,
        resource: data.resource,
        action: data.action,
        description: data.description,
      },
    });

    logger.info(`Permission créée: ${permission.name} par ${req.user?.userId}`);

    await permissionAuditService.logAction({
      actorUserId: req.user?.userId,
      action: 'PERMISSION_CREATED',
      permissionId: permission.id,
      permissionName: permission.name,
      metadata: {
        resource: permission.resource,
        action: permission.action,
      },
    });

    res.status(201).json({
      data: permission,
    });
  })
);

/**
 * POST /api/permissions/assign
 * Assigne une permission à un rôle
 */
router.post(
  '/assign',
  requireRole('super_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const data = assignPermissionSchema.parse(req.body);

    // Vérifier si l'association existe déjà
    const existing = await prisma.rolePermission.findFirst({
      where: {
        role: data.role,
        permissionId: data.permissionId,
      },
    });

    if (existing) {
      throw new AppError('Cette permission est déjà assignée à ce rôle', 409);
    }

    const rolePermission = await prisma.rolePermission.create({
      data: {
        role: data.role,
        permissionId: data.permissionId,
      },
      include: {
        permission: true,
      },
    });

    // Invalider le cache pour tous les utilisateurs avec ce rôle
    // Note: En production, on pourrait optimiser en invalidant seulement les caches concernés
    logger.info(
      `Permission ${rolePermission.permission.name} assignée au rôle ${data.role} par ${req.user?.userId}`
    );

    await permissionAuditService.logAction({
      actorUserId: req.user?.userId,
      action: 'PERMISSION_ASSIGNED',
      targetRole: data.role,
      permissionId: rolePermission.permissionId,
      permissionName: rolePermission.permission.name,
      metadata: {
        role: data.role,
      },
    });

    res.status(201).json({
      data: rolePermission,
    });
  })
);

/**
 * DELETE /api/permissions/assign/:id
 * Retire une permission d'un rôle
 */
router.delete(
  '/assign/:id',
  requireRole('super_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const rolePermission = await prisma.rolePermission.findUnique({
      where: { id: req.params.id },
      include: {
        permission: true,
      },
    });

    if (!rolePermission) {
      throw new AppError('Association permission-rôle non trouvée', 404);
    }

    await prisma.rolePermission.delete({
      where: { id: req.params.id },
    });

    logger.info(
      `Permission ${rolePermission.permission.name} retirée du rôle ${rolePermission.role} par ${req.user?.userId}`
    );

    await permissionAuditService.logAction({
      actorUserId: req.user?.userId,
      action: 'PERMISSION_REVOKED',
      targetRole: rolePermission.role,
      permissionId: rolePermission.permissionId,
      permissionName: rolePermission.permission.name,
      metadata: {
        role: rolePermission.role,
      },
    });

    res.json({
      message: 'Permission retirée du rôle avec succès',
    });
  })
);

/**
 * GET /api/permissions/user/:userId
 * Récupère toutes les permissions d'un utilisateur
 */
router.get(
  '/user/:userId',
  requireRole('admin'),
  asyncHandler(async (req: Request, res: Response) => {
    // Vérifier que l'utilisateur demande ses propres permissions ou est admin
    if (req.params.userId !== req.user?.userId && req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      throw new AppError('Accès refusé', 403);
    }

    const permissions = await permissionService.getUserPermissions(req.params.userId);
    const userRole = await permissionService.getUserRole(req.params.userId);

    res.json({
      data: {
        userId: req.params.userId,
        role: userRole,
        permissions,
      },
    });
  })
);

/**
 * GET /api/permissions/check
 * Vérifie si l'utilisateur actuel a une permission spécifique
 */
router.get(
  '/check',
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401);
    }

    const { resource, action } = req.query;

    if (!resource || !action || typeof resource !== 'string' || typeof action !== 'string') {
      throw new AppError('Les paramètres resource et action sont requis', 400);
    }

    const hasPermission = await permissionService.hasPermission(
      req.user.userId,
      resource,
      action
    );

    res.json({
      data: {
        hasPermission,
        resource,
        action,
      },
    });
  })
);

/**
 * GET /api/permissions/roles
 * Liste tous les rôles disponibles avec leurs permissions
 */
router.get(
  '/roles',
  requireRole('admin'),
  asyncHandler(async (_req: Request, res: Response) => {
    const roles = ['super_admin', 'admin', 'moderator', 'user', 'guest'] as const;

    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        const rolePermissions = await prisma.rolePermission.findMany({
          where: { role },
          include: {
            permission: true,
          },
        });

        return {
          role,
          permissions: rolePermissions.map((rp) => ({
            id: rp.permission.id,
            name: rp.permission.name,
            resource: rp.permission.resource,
            action: rp.permission.action,
            rolePermissionId: rp.id,
          })),
        };
      })
    );

    res.json({
      data: rolesWithPermissions,
    });
  })
);

/**
 * GET /api/permissions/audit
 * Récupère l'historique des actions sur les permissions
 */
router.get(
  '/audit',
  requireRole('super_admin'),
  asyncHandler(async (req: Request, res: Response) => {
    const filters = auditQuerySchema.parse(req.query);
    const result = await permissionAuditService.listLogs({
      page: filters.page,
      limit: filters.limit,
      action: filters.action,
      targetRole: filters.targetRole,
      actorUserId: filters.actorUserId,
    });

    res.json(result);
  })
);

export default router;

