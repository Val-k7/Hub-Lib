import { restApi } from "@/api/rest";

export interface ResourcePermissionEntry {
  id: string;
  resourceId: string;
  userId: string | null;
  groupId: string | null;
  permission: string;
  expiresAt: string | null;
  createdAt: string;
  user?: {
    userId: string;
    username: string | null;
    fullName: string | null;
    email: string;
  } | null;
  group?: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

export interface CreateResourcePermissionPayload {
  userId?: string;
  groupId?: string;
  permission: string;
  expiresAt?: string | null;
}

export const resourcePermissionsService = {
  async list(resourceId: string): Promise<ResourcePermissionEntry[]> {
    const response = await restApi.get(`/api/resources/${resourceId}/permissions`);
    return response.data;
  },

  async create(resourceId: string, payload: CreateResourcePermissionPayload) {
    const response = await restApi.post(`/api/resources/${resourceId}/permissions`, payload);
    return response.data;
  },

  async remove(resourceId: string, permissionId: string) {
    await restApi.delete(`/api/resources/${resourceId}/permissions/${permissionId}`);
  },
};

