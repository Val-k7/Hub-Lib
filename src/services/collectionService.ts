import { restApi } from "@/api/rest";

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCollectionPayload {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface UpdateCollectionPayload {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

export const collectionService = {
  async listCollections(): Promise<Collection[]> {
    const response = await restApi.get("/api/collections");
    return response.data;
  },

  async getCollection(collectionId: string): Promise<Collection> {
    const response = await restApi.get(`/api/collections/${collectionId}`);
    return response.data;
  },

  async createCollection(payload: CreateCollectionPayload): Promise<Collection> {
    const response = await restApi.post("/api/collections", payload);
    return response.data;
  },

  async updateCollection(collectionId: string, payload: UpdateCollectionPayload): Promise<Collection> {
    const response = await restApi.put(`/api/collections/${collectionId}`, payload);
    return response.data;
  },

  async deleteCollection(collectionId: string): Promise<void> {
    await restApi.delete(`/api/collections/${collectionId}`);
  },
};
