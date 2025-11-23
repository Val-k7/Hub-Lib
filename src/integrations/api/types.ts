/**
 * Types partagés pour le client API
 */

/**
 * Représente un utilisateur de l'API
 */
export interface ApiUser {
  id: string;
  userId: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
  created_at: string;
}

/**
 * Représente une session d'authentification API
 */
export interface ApiSession {
  access_token: string;
  refresh_token: string;
  user: ApiUser;
  expires_at?: number;
  expires_in?: number;
}

/**
 * Réponse standard de l'API
 */
export interface ApiResponse<T = any> {
  data: T | null;
  error: {
    message: string;
    code?: string;
    details?: any;
  } | null;
}

/**
 * Options de requête HTTP
 */
export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  signal?: AbortSignal;
}

/**
 * Configuration du client API
 */
export interface ApiClientConfig {
  baseUrl: string;
  wsUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * Callback pour les événements de session
 */
export type SessionCallback = (event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED', session: ApiSession | null) => void;

/**
 * Callback pour les notifications WebSocket
 */
export type NotificationCallback = (notification: any) => void;

/**
 * Abonnement WebSocket
 */
export interface WebSocketSubscription {
  unsubscribe: () => void;
}


