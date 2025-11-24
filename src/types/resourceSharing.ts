export type ResourceVisibility = "public" | "private" | "shared_users" | "shared_groups";
export type SharePermission = "read" | "write";
export type ResourceShareExpiration = string | null;

export interface ResourceShare {
  id: string;
  resourceId: string;
  sharedWithUserId: string | null;
  sharedWithGroupId: string | null;
  permission: SharePermission;
  expiresAt: ResourceShareExpiration;
  createdAt: string;
  sharedWithUser?: {
    userId: string;
    username: string | null;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
  sharedWithGroup?: {
    id: string;
    name: string;
    description: string | null;
  } | null;
}

