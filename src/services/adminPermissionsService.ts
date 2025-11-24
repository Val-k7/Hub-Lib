import { restApi } from "@/api/rest";
import type { AppRole } from "@/types/permissions";

export interface PermissionRoleAssignment {
  role: AppRole;
  rolePermissionId: string;
}

export interface PermissionItem {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string | null;
  roles: PermissionRoleAssignment[];
}

export interface RoleWithPermissions {
  role: AppRole;
  permissions: Array<{
    id: string;
    name: string;
    resource: string;
    action: string;
    rolePermissionId: string;
  }>;
}

export type PermissionAuditAction =
  | "PERMISSION_CREATED"
  | "PERMISSION_UPDATED"
  | "PERMISSION_DELETED"
  | "PERMISSION_ASSIGNED"
  | "PERMISSION_REVOKED";

export interface PermissionAuditLog {
  id: string;
  actorUserId: string | null;
  action: PermissionAuditAction;
  targetRole: AppRole | null;
  permissionId: string | null;
  permissionName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  permission?: {
    id: string;
    name: string;
    resource: string;
    action: string;
  } | null;
  actor?: {
    userId: string;
    username: string | null;
    fullName: string | null;
    email: string;
  } | null;
}

export interface AuditLogResponse {
  data: PermissionAuditLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreatePermissionPayload {
  resource: string;
  action: string;
  description?: string;
}

export interface AssignPermissionPayload {
  role: AppRole;
  permissionId: string;
}

export interface AuditFilters {
  page?: number;
  limit?: number;
  action?: PermissionAuditAction;
  targetRole?: AppRole;
  actorUserId?: string;
}

export const adminPermissionsService = {
  async listPermissions(): Promise<PermissionItem[]> {
    const response = await restApi.get("/api/permissions");
    return response.data?.data ?? [];
  },

  async createPermission(payload: CreatePermissionPayload) {
    const body = {
      name: `${payload.resource}:${payload.action}`,
      resource: payload.resource,
      action: payload.action,
      description: payload.description,
    };
    const response = await restApi.post("/api/permissions", body);
    return response.data?.data;
  },

  async assignPermission(payload: AssignPermissionPayload) {
    const response = await restApi.post("/api/permissions/assign", payload);
    return response.data?.data;
  },

  async revokePermission(rolePermissionId: string) {
    await restApi.delete(`/api/permissions/assign/${rolePermissionId}`);
  },

  async listRoles(): Promise<RoleWithPermissions[]> {
    const response = await restApi.get("/api/permissions/roles");
    return response.data?.data ?? [];
  },

  async listAuditLogs(filters: AuditFilters = {}): Promise<AuditLogResponse> {
    const response = await restApi.get("/api/permissions/audit", {
      params: {
        page: filters.page,
        limit: filters.limit,
        action: filters.action,
        targetRole: filters.targetRole,
        actorUserId: filters.actorUserId,
      },
    });
    return response.data;
  },
};

