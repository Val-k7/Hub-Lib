/**
 * Routes pour les groupes d'utilisateurs
 */

import express from 'express';
import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import { generalRateLimit } from '../middleware/rateLimit.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = express.Router();

// Schémas de validation
const createGroupSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
});

const updateGroupSchema = createGroupSchema.partial();

const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'member']).optional().default('member'),
});

/**
 * GET /api/groups
 * Liste des groupes (mes groupes si authentifié)
 */
router.get(
  '/',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    // Récupérer les groupes où l'utilisateur est membre ou propriétaire
    const groups = await prisma.group.findMany({
      where: {
        OR: [
          { ownerId: req.user.userId },
          {
            members: {
              some: {
                userId: req.user.userId,
              },
            },
          },
        ],
      },
      include: {
        owner: {
          select: {
            userId: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        members: {
          include: {
            profile: {
              select: {
                userId: true,
                username: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      data: groups.map((g) => ({
        ...g,
        membersCount: g._count.members,
      })),
    });
  })
);

/**
 * GET /api/groups/:id
 * Détails d'un groupe
 */
router.get(
  '/:id',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            userId: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
        members: {
          include: {
            profile: {
              select: {
                userId: true,
                username: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!group) {
      throw new AppError('Groupe non trouvé', 404, 'GROUP_NOT_FOUND');
    }

    // Vérifier que l'utilisateur est membre ou propriétaire
    const isOwner = group.ownerId === req.user.userId;
    const isMember = group.members.some((m) => m.userId === req.user.userId);

    if (!isOwner && !isMember && req.user.role !== 'admin') {
      throw new AppError('Accès refusé à ce groupe', 403, 'ACCESS_DENIED');
    }

    res.json({
      ...group,
      membersCount: group._count.members,
      isOwner,
      userRole: isOwner ? 'admin' : group.members.find((m) => m.userId === req.user!.userId)?.role || null,
    });
  })
);

/**
 * POST /api/groups
 * Créer un nouveau groupe
 */
router.post(
  '/',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const data = createGroupSchema.parse(req.body);

    const group = await prisma.group.create({
      data: {
        ownerId: req.user.userId,
        name: data.name,
        description: data.description,
      },
      include: {
        owner: {
          select: {
            userId: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Le propriétaire est automatiquement membre admin
    await prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId: req.user.userId,
        role: 'admin',
      },
    });

    res.status(201).json(group);
  })
);

/**
 * PUT /api/groups/:id
 * Mettre à jour un groupe
 */
router.put(
  '/:id',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;
    const data = updateGroupSchema.parse(req.body);

    // Vérifier que le groupe existe et que l'utilisateur est propriétaire ou admin du groupe
    const existing = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          where: {
            userId: req.user.userId,
          },
        },
      },
    });

    if (!existing) {
      throw new AppError('Groupe non trouvé', 404, 'GROUP_NOT_FOUND');
    }

    const isOwner = existing.ownerId === req.user.userId;
    const isAdmin = existing.members.some((m) => m.userId === req.user.userId && m.role === 'admin');
    const isPlatformAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin && !isPlatformAdmin) {
      throw new AppError('Vous n\'avez pas les permissions pour modifier ce groupe', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    const group = await prisma.group.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      include: {
        owner: {
          select: {
            userId: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.json(group);
  })
);

/**
 * DELETE /api/groups/:id
 * Supprimer un groupe
 */
router.delete(
  '/:id',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id } = req.params;

    // Vérifier que le groupe existe et que l'utilisateur est propriétaire
    const existing = await prisma.group.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError('Groupe non trouvé', 404, 'GROUP_NOT_FOUND');
    }

    if (existing.ownerId !== req.user.userId && req.user.role !== 'admin') {
      throw new AppError('Vous n\'êtes pas propriétaire de ce groupe', 403, 'NOT_OWNER');
    }

    // Supprimer en cascade (les membres seront supprimés automatiquement)
    await prisma.group.delete({
      where: { id },
    });

    res.status(204).send();
  })
);

/**
 * POST /api/groups/:id/members
 * Ajouter un membre au groupe
 */
router.post(
  '/:id/members',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id: groupId } = req.params;
    const data = addMemberSchema.parse(req.body);

    // Vérifier que le groupe existe et que l'utilisateur peut ajouter des membres
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: {
            userId: req.user.userId,
          },
        },
      },
    });

    if (!group) {
      throw new AppError('Groupe non trouvé', 404, 'GROUP_NOT_FOUND');
    }

    const isOwner = group.ownerId === req.user.userId;
    const isAdmin = group.members.some((m) => m.userId === req.user.userId && m.role === 'admin');

    if (!isOwner && !isAdmin && req.user.role !== 'admin') {
      throw new AppError('Vous n\'avez pas les permissions pour ajouter des membres', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Vérifier que l'utilisateur à ajouter existe
    const userToAdd = await prisma.profile.findUnique({
      where: { userId: data.userId },
    });

    if (!userToAdd) {
      throw new AppError('Utilisateur non trouvé', 404, 'USER_NOT_FOUND');
    }

    // Vérifier si l'utilisateur n'est pas déjà membre
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: data.userId,
        },
      },
    });

    if (existingMember) {
      throw new AppError('Cet utilisateur est déjà membre du groupe', 409, 'ALREADY_MEMBER');
    }

    const member = await prisma.groupMember.create({
      data: {
        groupId,
        userId: data.userId,
        role: data.role,
      },
      include: {
        profile: {
          select: {
            userId: true,
            username: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.status(201).json(member);
  })
);

/**
 * DELETE /api/groups/:id/members/:userId
 * Retirer un membre du groupe
 */
router.delete(
  '/:id/members/:userId',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id: groupId, userId } = req.params;

    // Vérifier que le groupe existe et que l'utilisateur peut retirer des membres
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: {
            userId: req.user.userId,
          },
        },
      },
    });

    if (!group) {
      throw new AppError('Groupe non trouvé', 404, 'GROUP_NOT_FOUND');
    }

    const isOwner = group.ownerId === req.user.userId;
    const isAdmin = group.members.some((m) => m.userId === req.user.userId && m.role === 'admin');
    const isRemovingSelf = userId === req.user.userId;

    // L'utilisateur peut se retirer lui-même, ou un admin/propriétaire peut retirer quelqu'un
    if (!isRemovingSelf && !isOwner && !isAdmin && req.user.role !== 'admin') {
      throw new AppError('Vous n\'avez pas les permissions pour retirer des membres', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Ne pas permettre au propriétaire de se retirer
    if (isRemovingSelf && isOwner) {
      throw new AppError('Le propriétaire du groupe ne peut pas se retirer', 403, 'OWNER_CANNOT_LEAVE');
    }

    await prisma.groupMember.deleteMany({
      where: {
        groupId,
        userId,
      },
    });

    res.status(204).send();
  })
);

/**
 * GET /api/groups/:id/resources
 * Récupérer les ressources partagées avec un groupe
 */
router.get(
  '/:id/resources',
  authMiddleware,
  generalRateLimit,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError('Authentification requise', 401, 'AUTH_REQUIRED');
    }

    const { id: groupId } = req.params;

    // Vérifier que le groupe existe et que l'utilisateur est membre
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: {
            userId: req.user.userId,
          },
        },
      },
    });

    if (!group) {
      throw new AppError('Groupe non trouvé', 404, 'GROUP_NOT_FOUND');
    }

    const isMember = group.members.length > 0 || group.ownerId === req.user.userId;

    if (!isMember && req.user.role !== 'admin') {
      throw new AppError('Vous n\'êtes pas membre de ce groupe', 403, 'NOT_MEMBER');
    }

    // Récupérer les ressources partagées avec le groupe
    const resourceShares = await prisma.resourceShare.findMany({
      where: {
        sharedWithGroupId: groupId,
      },
      include: {
        resource: {
          include: {
            profile: {
              select: {
                userId: true,
                username: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    res.json({
      data: resourceShares.map((share) => share.resource),
    });
  })
);

export default router;



