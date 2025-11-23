/**
 * API REST pour intégrations externes
 * Simule une API REST complète avec authentification par token
 */

import { localClient } from '@/integrations/local/client';
import { analyticsService } from '@/services/analyticsService';

export interface ApiToken {
  id: string;
  user_id: string;
  token: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  meta?: {
    total?: number;
    page?: number;
    per_page?: number;
  };
}

class RestApi {
  private readonly TOKENS_KEY = 'hub-lib-api-tokens';
  private readonly RATE_LIMIT_KEY = 'hub-lib-api-rate-limit';

  /**
   * Génère un token API unique
   */
  private generateToken(): string {
    return `hub_lib_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  /**
   * Crée un nouveau token API
   */
  async createToken(userId: string, name: string, expiresInDays?: number): Promise<ApiToken> {
    const tokens = this.getTokens();
    const token = this.generateToken();
    
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const apiToken: ApiToken = {
      id: `token_${Date.now()}`,
      user_id: userId,
      token,
      name,
      created_at: new Date().toISOString(),
      last_used_at: null,
      expires_at: expiresAt,
    };

    tokens.push(apiToken);
    this.saveTokens(tokens);

    return apiToken;
  }

  /**
   * Valide un token API
   */
  async validateToken(token: string): Promise<{ valid: boolean; userId?: string; token?: ApiToken }> {
    const tokens = this.getTokens();
    const apiToken = tokens.find(t => t.token === token);

    if (!apiToken) {
      return { valid: false };
    }

    // Vérifier l'expiration
    if (apiToken.expires_at && new Date(apiToken.expires_at) < new Date()) {
      return { valid: false };
    }

    // Mettre à jour la dernière utilisation
    apiToken.last_used_at = new Date().toISOString();
    this.saveTokens(tokens);

    return {
      valid: true,
      userId: apiToken.user_id,
      token: apiToken,
    };
  }

  /**
   * Récupère tous les tokens d'un utilisateur
   */
  getUserTokens(userId: string): ApiToken[] {
    return this.getTokens().filter(t => t.user_id === userId);
  }

  /**
   * Supprime un token
   */
  deleteToken(tokenId: string, userId: string): void {
    const tokens = this.getTokens();
    const filtered = tokens.filter(t => !(t.id === tokenId && t.user_id === userId));
    this.saveTokens(filtered);
  }

  /**
   * Vérifie le rate limiting
   */
  checkRateLimit(token: string, limit: number = 100, windowMs: number = 60000): boolean {
    const key = `${this.RATE_LIMIT_KEY}_${token}`;
    const data = localStorage.getItem(key);
    
    if (!data) {
      localStorage.setItem(key, JSON.stringify({
        count: 1,
        resetAt: Date.now() + windowMs,
      }));
      return true;
    }

    const { count, resetAt } = JSON.parse(data);

    if (Date.now() > resetAt) {
      localStorage.setItem(key, JSON.stringify({
        count: 1,
        resetAt: Date.now() + windowMs,
      }));
      return true;
    }

    if (count >= limit) {
      return false;
    }

    localStorage.setItem(key, JSON.stringify({
      count: count + 1,
      resetAt,
    }));

    return true;
  }

  /**
   * Endpoint GET /api/v1/resources
   */
  async getResources(params: {
    page?: number;
    per_page?: number;
    category?: string;
    tags?: string[];
    search?: string;
    user_id?: string;
  }): Promise<ApiResponse<any[]>> {
    try {
      let query = localClient.from('resources').select('*, profiles(*)');

      if (params.category) {
        query = query.eq('category', params.category);
      }

      if (params.user_id) {
        query = query.eq('user_id', params.user_id);
      }

      if (params.search) {
        // Recherche simple dans le titre et la description
        const { data: allResources } = await localClient
          .from('resources')
          .select('*, profiles(*)')
          .execute();

        const filtered = allResources?.filter((r: any) => {
          const searchLower = params.search!.toLowerCase();
          return (
            r.title.toLowerCase().includes(searchLower) ||
            r.description.toLowerCase().includes(searchLower) ||
            r.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
          );
        }) || [];

        const page = params.page || 1;
        const perPage = params.per_page || 20;
        const start = (page - 1) * perPage;
        const end = start + perPage;

        return {
          data: filtered.slice(start, end),
          meta: {
            total: filtered.length,
            page,
            per_page: perPage,
          },
        };
      }

      if (params.tags && params.tags.length > 0) {
        const { data: allResources } = await localClient
          .from('resources')
          .select('*, profiles(*)')
          .execute();

        const filtered = allResources?.filter((r: any) =>
          params.tags!.some(tag => r.tags?.includes(tag))
        ) || [];

        const page = params.page || 1;
        const perPage = params.per_page || 20;
        const start = (page - 1) * perPage;
        const end = start + perPage;

        return {
          data: filtered.slice(start, end),
          meta: {
            total: filtered.length,
            page,
            per_page: perPage,
          },
        };
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .execute();

      if (error) throw error;

      const page = params.page || 1;
      const perPage = params.per_page || 20;
      const start = (page - 1) * perPage;
      const end = start + perPage;

      return {
        data: data?.slice(start, end) || [],
        meta: {
          total: data?.length || 0,
          page,
          per_page: perPage,
        },
      };
    } catch (error: any) {
      return {
        error: {
          message: error.message || 'Erreur lors de la récupération des ressources',
          code: 'RESOURCE_FETCH_ERROR',
        },
      };
    }
  }

  /**
   * Endpoint GET /api/v1/resources/:id
   */
  async getResource(id: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await localClient
        .from('resources')
        .select('*, profiles(*)')
        .eq('id', id)
        .single()
        .execute();

      if (error) throw error;

      // Track analytics
      analyticsService.track('api_resource_view', { resourceId: id });

      return { data };
    } catch (error: any) {
      return {
        error: {
          message: error.message || 'Ressource non trouvée',
          code: 'RESOURCE_NOT_FOUND',
        },
      };
    }
  }

  /**
   * Endpoint POST /api/v1/resources
   */
  async createResource(userId: string, resourceData: any): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await localClient
        .from('resources')
        .insert({
          ...resourceData,
          user_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*, profiles(*)')
        .single()
        .execute();

      if (error) throw error;

      analyticsService.track('api_resource_create', { resourceId: data.id }, userId);

      return { data };
    } catch (error: any) {
      return {
        error: {
          message: error.message || 'Erreur lors de la création de la ressource',
          code: 'RESOURCE_CREATE_ERROR',
        },
      };
    }
  }

  /**
   * Endpoint PUT /api/v1/resources/:id
   */
  async updateResource(id: string, userId: string, updates: any): Promise<ApiResponse<any>> {
    try {
      // Vérifier que l'utilisateur est propriétaire
      const { data: resource } = await localClient
        .from('resources')
        .select('user_id')
        .eq('id', id)
        .single()
        .execute();

      if (!resource || resource.user_id !== userId) {
        return {
          error: {
            message: 'Non autorisé',
            code: 'UNAUTHORIZED',
          },
        };
      }

      const { data, error } = await localClient
        .from('resources')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, profiles(*)')
        .single()
        .execute();

      if (error) throw error;

      analyticsService.track('api_resource_update', { resourceId: id }, userId);

      return { data };
    } catch (error: any) {
      return {
        error: {
          message: error.message || 'Erreur lors de la mise à jour',
          code: 'RESOURCE_UPDATE_ERROR',
        },
      };
    }
  }

  /**
   * Endpoint DELETE /api/v1/resources/:id
   */
  async deleteResource(id: string, userId: string): Promise<ApiResponse<void>> {
    try {
      // Vérifier que l'utilisateur est propriétaire
      const { data: resource } = await localClient
        .from('resources')
        .select('user_id')
        .eq('id', id)
        .single()
        .execute();

      if (!resource || resource.user_id !== userId) {
        return {
          error: {
            message: 'Non autorisé',
            code: 'UNAUTHORIZED',
          },
        };
      }

      const { error } = await localClient
        .from('resources')
        .delete()
        .eq('id', id)
        .execute();

      if (error) throw error;

      analyticsService.track('api_resource_delete', { resourceId: id }, userId);

      return {};
    } catch (error: any) {
      return {
        error: {
          message: error.message || 'Erreur lors de la suppression',
          code: 'RESOURCE_DELETE_ERROR',
        },
      };
    }
  }

  /**
   * Endpoint GET /api/v1/users/:id
   */
  async getUser(id: string): Promise<ApiResponse<any>> {
    try {
      const { data, error } = await localClient
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()
        .execute();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return {
        error: {
          message: error.message || 'Utilisateur non trouvé',
          code: 'USER_NOT_FOUND',
        },
      };
    }
  }

  /**
   * Endpoint GET /api/v1/stats
   */
  async getStats(): Promise<ApiResponse<any>> {
    try {
      const { data: resources } = await localClient
        .from('resources')
        .select('*')
        .execute();

      const { data: users } = await localClient
        .from('profiles')
        .select('*')
        .execute();

      const stats = analyticsService.getStats();

      return {
        data: {
          total_resources: resources?.length || 0,
          total_users: users?.length || 0,
          total_events: stats.totalEvents,
          events_by_type: stats.eventsByType,
        },
      };
    } catch (error: any) {
      return {
        error: {
          message: error.message || 'Erreur lors de la récupération des statistiques',
          code: 'STATS_ERROR',
        },
      };
    }
  }

  private getTokens(): ApiToken[] {
    const data = localStorage.getItem(this.TOKENS_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveTokens(tokens: ApiToken[]): void {
    localStorage.setItem(this.TOKENS_KEY, JSON.stringify(tokens));
  }
}

export const restApi = new RestApi();


