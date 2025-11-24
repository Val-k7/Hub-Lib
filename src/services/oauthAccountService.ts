/**
 * Service de gestion des comptes OAuth (frontend)
 */

import { client } from '@/integrations/client';
import { logger } from '@/lib/logger';
import { handleServiceError } from './errorHandler';

export type OAuthProvider = 'github' | 'google';

export interface OAuthAccount {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  providerEmail: string | null;
  scope: string[];
  metadata: Record<string, any> | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

class OAuthAccountService {
  /**
   * Récupère tous les comptes OAuth de l'utilisateur
   */
  async getOAuthAccounts(): Promise<OAuthAccount[]> {
    try {
      const response = await client.request('/api/oauth-accounts', {
        method: 'GET',
      });

      if (response.error) {
        throw handleServiceError(response.error);
      }

      return response.data as OAuthAccount[];
    } catch (error) {
      logger.error('Erreur lors de la récupération des comptes OAuth:', error);
      throw handleServiceError(error);
    }
  }

  /**
   * Récupère le compte OAuth principal pour un provider
   */
  async getPrimaryOAuthAccount(provider: OAuthProvider): Promise<OAuthAccount | null> {
    try {
      const response = await client.request(`/api/oauth-accounts/${provider}`, {
        method: 'GET',
      });

      if (response.error) {
        if (response.error.code === 'OAUTH_ACCOUNT_NOT_FOUND') {
          return null;
        }
        throw handleServiceError(response.error);
      }

      return response.data as OAuthAccount;
    } catch (error) {
      logger.error('Erreur lors de la récupération du compte OAuth principal:', error);
      throw handleServiceError(error);
    }
  }

  /**
   * Délie un compte OAuth
   */
  async unlinkOAuthAccount(accountId: string): Promise<void> {
    try {
      const response = await client.request(`/api/oauth-accounts/${accountId}`, {
        method: 'DELETE',
      });

      if (response.error) {
        throw handleServiceError(response.error);
      }
    } catch (error) {
      logger.error('Erreur lors du déliage du compte OAuth:', error);
      throw handleServiceError(error);
    }
  }

  /**
   * Définit un compte OAuth comme principal
   */
  async setPrimaryOAuthAccount(accountId: string): Promise<OAuthAccount> {
    try {
      const response = await client.request(`/api/oauth-accounts/${accountId}/primary`, {
        method: 'PUT',
      });

      if (response.error) {
        throw handleServiceError(response.error);
      }

      return response.data as OAuthAccount;
    } catch (error) {
      logger.error('Erreur lors de la mise à jour du compte OAuth principal:', error);
      throw handleServiceError(error);
    }
  }

  /**
   * Initie la liaison d'un compte OAuth
   * Redirige vers l'endpoint OAuth du backend
   */
  initiateOAuthLink(provider: OAuthProvider): void {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    window.location.href = `${apiUrl}/api/auth/oauth/${provider}?link=true`;
  }
}

export const oauthAccountService = new OAuthAccountService();

