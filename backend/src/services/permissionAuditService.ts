import type { AppRole, Prisma } from '@prisma/client';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

export type PermissionAuditAction =
  | 'PERMISSION_CREATED'
  | 'PERMISSION_UPDATED'
  | 'PERMISSION_DELETED'
  | 'PERMISSION_ASSIGNED'
  | 'PERMISSION_REVOKED';

interface LogActionPayload {
  actorUserId?: string | null;
  action: PermissionAuditAction;
  targetRole?: AppRole | null;
  permissionId?: string | null;
  permissionName?: string | null;
  metadata?: Prisma.InputJsonValue | null;
}

interface ListLogsParams {
  page?: number;
  limit?: number;
  action?: PermissionAuditAction;
  targetRole?: AppRole;
  actorUserId?: string;
}

class PermissionAuditService {
  async logAction(payload: LogActionPayload) {
    try {
      return await prisma.permissionAuditLog.create({
        data: {
          actorUserId: payload.actorUserId ?? null,
          action: payload.action,
          targetRole: payload.targetRole ?? null,
          permissionId: payload.permissionId ?? null,
          permissionName: payload.permissionName ?? null,
          metadata: payload.metadata ?? null,
        },
      });
    } catch (error) {
      logger.error('Erreur lors de la création d’un audit log', error);
      return null;
    }
  }

  async listLogs(params: ListLogsParams) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params.action) {
      where.action = params.action;
    }

    if (params.targetRole) {
      where.targetRole = params.targetRole;
    }

    if (params.actorUserId) {
      where.actorUserId = params.actorUserId;
    }

    const [logs, total] = await Promise.all([
      prisma.permissionAuditLog.findMany({
        where,
        include: {
          permission: {
            select: {
              id: true,
              name: true,
              resource: true,
              action: true,
            },
          },
          actor: {
            select: {
              userId: true,
              username: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.permissionAuditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const permissionAuditService = new PermissionAuditService();

