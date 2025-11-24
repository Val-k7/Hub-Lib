/**
 * Service de gestion des utilisateurs pour les admins
 */

import { client } from '@/integrations/client';
import { logger } from '@/lib/logger';
import { handleServiceError } from './errorHandler';

export interface User {
  userId: string;
  email: string;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: 'admin' | 'user';
  resourcesCount: number;
  collectionsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UsersListResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

class UserManagementService {
  /**
   * Récupère la liste des utilisateurs avec pagination
   */
  async getUsers(page: number = 1, limit: number = 20, search?: string): Promise<UsersListResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (search) {
        params.append('search', search);
      }

      const response = await client.request(`/api/admin/users?${params.toString()}`, {
        method: 'GET',
      });

      if (response.error) {
        throw handleServiceError(response.error);
      }

      return response.data as UsersListResponse;
    } catch (error) {
      logger.error('Erreur lors de la récupération des utilisateurs:', error);
      throw handleServiceError(error);
    }
  }

  /**
   * Met à jour le rôle d'un utilisateur
   */
  async updateUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
    try {
      const response = await client.request(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        body: { role },
      });

      if (response.error) {
        throw handleServiceError(response.error);
      }
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du rôle:', error);
      throw handleServiceError(error);
    }
  }
}

export const userManagementService = new UserManagementService();

