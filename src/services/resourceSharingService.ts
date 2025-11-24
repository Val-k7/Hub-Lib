import { restApi } from "@/api/rest";
import type {
  SharePermission,
  ResourceShareExpiration,
  ResourceVisibility,
  ResourceShare,
} from "@/types/resourceSharing";

export interface ShareResourcePayload {
  sharedWithUserId?: string;
  sharedWithGroupId?: string;
  permission?: SharePermission;
  expiresAt?: ResourceShareExpiration;
}

export interface UpdateSharePayload {
  permission?: SharePermission;
  expiresAt?: ResourceShareExpiration;
}

const buildShareUrl = (resourceId: string, suffix = "") =>
  `/api/resources/${resourceId}${suffix}`;

export const resourceSharingService = {
  async listShares(resourceId: string): Promise<ResourceShare[]> {
    const response = await restApi.get(buildShareUrl(resourceId, "/shares"));
    return response.data;
  },

  async shareResource(resourceId: string, payload: ShareResourcePayload): Promise<ResourceShare> {
    const response = await restApi.post(buildShareUrl(resourceId, "/share"), payload);
    return response.data;
  },

  async updateShare(resourceId: string, shareId: string, payload: UpdateSharePayload): Promise<ResourceShare> {
    const response = await restApi.put(buildShareUrl(resourceId, `/shares/${shareId}`), payload);
    return response.data;
  },

  async deleteShare(resourceId: string, shareId: string): Promise<void> {
    await restApi.delete(buildShareUrl(resourceId, `/shares/${shareId}`));
  },

  async updateVisibility(resourceId: string, visibility: ResourceVisibility): Promise<void> {
    await restApi.put(buildShareUrl(resourceId), { visibility });
  },
};

