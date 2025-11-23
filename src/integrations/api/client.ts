/**
 * Client API pour communiquer avec le backend
 * Interface compatible avec LocalClient pour faciliter la migration
 * 
 * @module ApiClient
 */

import type { ApiSession, ApiUser, ApiResponse, ApiClientConfig, SessionCallback, RequestOptions } from './types.js';
import { ApiQueryBuilder } from './queryBuilder.js';
import { WebSocketService } from './websocket.js';

const DEFAULT_CONFIG: ApiClientConfig = {
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  wsUrl: import.meta.env.VITE_WS_URL || (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace('http://', 'ws://').replace('https://', 'wss://'),
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};

/**
 * Client API principal
 */
export class ApiClient {
  private config: ApiClientConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private sessionCallbacks: Set<SessionCallback> = new Set();
  private wsService: WebSocketService | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializeSession();
    this.initializeWebSocket();
  }

  /**
   * Initialise la session depuis le localStorage
   */
  private initializeSession(): void {
    try {
      const stored = localStorage.getItem('hub-lib-api-auth');
      if (stored) {
        const session: ApiSession = JSON.parse(stored);
        this.accessToken = session.access_token;
        this.refreshToken = session.refresh_token;
        
        // Vérifier l'expiration
        if (session.expires_at && session.expires_at < Date.now() / 1000) {
          // Token expiré, essayer de le rafraîchir
          this.refreshAccessToken().catch(() => {
            this.clearSession();
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la session:', error);
      this.clearSession();
    }
  }

  /**
   * Initialise le service WebSocket
   */
  private initializeWebSocket(): void {
    if (this.config.wsUrl && this.accessToken) {
      this.wsService = new WebSocketService(this.config.wsUrl, () => this.accessToken);
    }
  }

  /**
   * Stocke la session dans le localStorage
   */
  private saveSession(session: ApiSession): void {
    localStorage.setItem('hub-lib-api-auth', JSON.stringify(session));
    this.accessToken = session.access_token;
    this.refreshToken = session.refresh_token;
    this.initializeWebSocket();
  }

  /**
   * Efface la session
   */
  private clearSession(): void {
    localStorage.removeItem('hub-lib-api-auth');
    this.accessToken = null;
    this.refreshToken = null;
    if (this.wsService) {
      this.wsService.disconnect();
      this.wsService = null;
    }
  }

  /**
   * Rafraîchit le token d'accès
   */
  private async refreshAccessToken(): Promise<string | null> {
    // Éviter plusieurs rafraîchissements simultanés
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.refreshToken) {
      return null;
    }

    this.refreshPromise = this.request<{ access_token: string; refresh_token?: string }>('/api/auth/refresh', {
      method: 'POST',
      body: { refresh_token: this.refreshToken },
    }).then(async (response) => {
      this.refreshPromise = null;
      if (response.data && response.data.access_token) {
        const session = await this.auth.getSession();
        if (session.data?.session) {
          this.saveSession(session.data.session);
          this.notifySessionCallbacks('TOKEN_REFRESHED', session.data.session);
          return response.data.access_token;
        }
      }
      this.clearSession();
      this.notifySessionCallbacks('SIGNED_OUT', null);
      return null;
    }).catch(() => {
      this.refreshPromise = null;
      this.clearSession();
      this.notifySessionCallbacks('SIGNED_OUT', null);
      return null;
    });

    return this.refreshPromise;
  }

  /**
   * Effectue une requête HTTP avec gestion automatique des tokens
   */
  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Ajouter le token d'accès si disponible
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // Construire l'URL avec les paramètres de requête
    let finalUrl = url;
    if (options.params) {
      const params = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
      finalUrl += `?${params.toString()}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(finalUrl, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: options.signal || controller.signal,
      });

      clearTimeout(timeoutId);

      // Si 401, essayer de rafraîchir le token
      if (response.status === 401 && this.refreshToken && !endpoint.includes('/auth/refresh')) {
        const newToken = await this.refreshAccessToken();
        if (newToken) {
          // Réessayer la requête avec le nouveau token
          headers['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(finalUrl, {
            method: options.method || 'GET',
            headers,
            body: options.body ? JSON.stringify(options.body) : undefined,
            signal: options.signal,
          });
          return this.handleResponse<T>(retryResponse);
        }
      }

      return this.handleResponse<T>(response);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          data: null,
          error: { message: 'Request timeout', code: 'TIMEOUT' },
        };
      }

      return {
        data: null,
        error: {
          message: error.message || 'Network error',
          code: 'NETWORK_ERROR',
        },
      };
    }
  }

  /**
   * Traite la réponse HTTP
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      let error: any;
      if (isJson) {
        error = await response.json().catch(() => ({ message: 'Unknown error' }));
      } else {
        error = { message: await response.text().catch(() => 'Unknown error') };
      }

      return {
        data: null,
        error: {
          message: error.message || `HTTP ${response.status}`,
          code: error.code || `HTTP_${response.status}`,
          details: error,
        },
      };
    }

    if (response.status === 204 || !isJson) {
      return { data: null as any, error: null };
    }

    const data = await response.json();
    return { data: data as T, error: null };
  }

  /**
   * Notifie les callbacks de session
   */
  private notifySessionCallbacks(event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED', session: ApiSession | null): void {
    this.sessionCallbacks.forEach((callback) => {
      try {
        callback(event, session);
      } catch (error) {
        console.error('Erreur dans le callback de session:', error);
      }
    });
  }

  /**
   * API d'authentification
   */
  auth = {
    /**
     * Récupère la session actuelle
     */
    getSession: async (): Promise<{ data: { session: ApiSession | null } }> => {
      if (!this.accessToken) {
        return { data: { session: null } };
      }

      const response = await this.request<{ user: ApiUser }>('/api/auth/session');
      if (response.error || !response.data) {
        this.clearSession();
        return { data: { session: null } };
      }

      const session: ApiSession = {
        access_token: this.accessToken!,
        refresh_token: this.refreshToken!,
        user: {
          id: response.data.user.userId,
          userId: response.data.user.userId,
          email: response.data.user.email || '',
          user_metadata: response.data.user.user_metadata,
          created_at: response.data.user.created_at || new Date().toISOString(),
        },
      };

      return { data: { session } };
    },

    /**
     * Inscription
     */
    signUp: async (credentials: { email: string; password: string; metadata?: any }): Promise<{ data: { session: ApiSession | null; user: ApiUser | null }; error: any }> => {
      const response = await this.request<{ access_token: string; refresh_token: string; user: ApiUser }>('/api/auth/signup', {
        method: 'POST',
        body: {
          email: credentials.email,
          password: credentials.password,
          metadata: credentials.metadata,
        },
      });

      if (response.error || !response.data) {
        return { data: { session: null, user: null }, error: response.error };
      }

      const session: ApiSession = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        user: response.data.user,
      };

      this.saveSession(session);
      this.notifySessionCallbacks('SIGNED_IN', session);

      return { data: { session, user: response.data.user }, error: null };
    },

    /**
     * Connexion
     */
    signInWithPassword: async (credentials: { email: string; password: string }): Promise<{ data: { session: ApiSession | null; user: ApiUser | null }; error: any }> => {
      const response = await this.request<{ access_token: string; refresh_token: string; user: ApiUser }>('/api/auth/signin', {
        method: 'POST',
        body: credentials,
      });

      if (response.error || !response.data) {
        return { data: { session: null, user: null }, error: response.error };
      }

      const session: ApiSession = {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        user: response.data.user,
      };

      this.saveSession(session);
      this.notifySessionCallbacks('SIGNED_IN', session);

      return { data: { session, user: response.data.user }, error: null };
    },

    /**
     * Déconnexion
     */
    signOut: async (): Promise<{ error: any }> => {
      if (this.accessToken) {
        await this.request('/api/auth/signout', {
          method: 'POST',
        });
      }

      this.clearSession();
      this.notifySessionCallbacks('SIGNED_OUT', null);

      return { error: null };
    },

    /**
     * Abonnement aux changements de session
     */
    onAuthStateChange: (callback: SessionCallback): { data: { subscription: { unsubscribe: () => void } } } => {
      this.sessionCallbacks.add(callback);

      // Appeler immédiatement avec l'état actuel
      this.auth.getSession().then(({ data }) => {
        if (data.session) {
          callback('SIGNED_IN', data.session);
        } else {
          callback('SIGNED_OUT', null);
        }
      });

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.sessionCallbacks.delete(callback);
            },
          },
        },
      };
    },
  };

  /**
   * Démarre une requête sur une table
   */
  from(table: string): ApiQueryBuilder {
    return new ApiQueryBuilder(this, table);
  }

  /**
   * Appel RPC (appelle un endpoint spécifique)
   */
  rpc = async (functionName: string, params: any = {}): Promise<ApiResponse<any>> => {
    return this.request(`/api/rpc/${functionName}`, {
      method: 'POST',
      body: params,
    });
  };

  /**
   * Canal WebSocket pour les notifications temps réel
   */
  channel = (name: string) => {
    if (!this.wsService) {
      this.initializeWebSocket();
    }

    if (!this.wsService) {
      // Fallback si WebSocket non disponible
      return {
        on: () => ({
          subscribe: () => ({
            data: {
              subscription: {
                unsubscribe: () => {},
              },
            },
          }),
        }),
        send: () => {},
      };
    }

    return this.wsService.getChannel(name);
  };
}

// Export singleton
export const apiClient = new ApiClient();


