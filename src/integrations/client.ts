/**
 * Adapter pour basculer entre LocalClient et ApiClient
 * Permet une migration progressive
 */

import { localClient } from './local/client.js';
import { apiClient } from './api/client.js';
import { logger } from '@/lib/logger';

/**
 * Cache pour stocker l'état de disponibilité du backend
 */
let backendAvailableCache: boolean | null = null;
let backendCheckPromise: Promise<boolean> | null = null;
let lastCheckTime: number = 0;
const CHECK_CACHE_DURATION = 30000; // 30 secondes

/**
 * Vérifie si le backend est disponible
 * Utilise un cache pour éviter trop de requêtes
 */
async function checkBackendAvailability(): Promise<boolean> {
  // Utiliser le cache si disponible et récent
  const now = Date.now();
  if (backendAvailableCache !== null && (now - lastCheckTime) < CHECK_CACHE_DURATION) {
    return backendAvailableCache;
  }

  // Éviter plusieurs checks simultanés
  if (backendCheckPromise) {
    return backendCheckPromise;
  }

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  
  backendCheckPromise = (async () => {
    try {
      // Essayer plusieurs endpoints de health check
      const healthEndpoints = [
        '/api/health',
        '/health',
        '/api',
      ];

      for (const endpoint of healthEndpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 secondes timeout
          
          const response = await fetch(`${apiUrl}${endpoint}`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
            },
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok || response.status === 401 || response.status === 403) {
            // 401/403 signifie que le serveur répond (même si non authentifié)
            backendAvailableCache = true;
            lastCheckTime = now;
            backendCheckPromise = null;
            return true;
          }
        } catch (error) {
          // Continuer avec le prochain endpoint
          continue;
        }
      }

      // Aucun endpoint n'a répondu
      backendAvailableCache = false;
      lastCheckTime = now;
      backendCheckPromise = null;
      return false;
    } catch (error) {
      backendAvailableCache = false;
      lastCheckTime = now;
      backendCheckPromise = null;
      return false;
    }
  })();

  return backendCheckPromise;
}

/**
 * Détermine quel client utiliser
 * Peut être configuré via variable d'environnement ou feature flag
 * Vérifie automatiquement la disponibilité du backend
 */
const useApiClient = async (): Promise<boolean> => {
  // Vérifier la variable d'environnement (force l'utilisation de l'API)
  if (import.meta.env.VITE_USE_API_CLIENT === 'true') {
    return true;
  }

  // Vérifier la variable d'environnement (force l'utilisation du local)
  if (import.meta.env.VITE_USE_API_CLIENT === 'false') {
    return false;
  }

  // Vérifier automatiquement si le backend est disponible
  return await checkBackendAvailability();
};

/**
 * Version synchrone pour l'export initial
 * Utilise le cache si disponible, sinon essaie ApiClient par défaut
 */
const useApiClientSync = (): boolean => {
  // Si la variable d'environnement force l'utilisation de l'API
  if (import.meta.env.VITE_USE_API_CLIENT === 'true') {
    return true;
  }

  // Si la variable d'environnement force l'utilisation du local
  if (import.meta.env.VITE_USE_API_CLIENT === 'false') {
    return false;
  }

  // Utiliser le cache si disponible
  if (backendAvailableCache !== null) {
    return backendAvailableCache;
  }

  // Par défaut, essayer ApiClient (optimiste)
  // Le check asynchrone sera fait en arrière-plan et basculera vers LocalClient si nécessaire
  checkBackendAvailability().then((available) => {
    if (!available && backendAvailableCache === false) {
      // Le backend n'est pas disponible, mais on ne peut pas changer l'export dynamiquement
      // L'utilisateur devra recharger la page ou utiliser directement localClient
      logger.warn('Backend non disponible. Utilisez localClient directement ou rechargez la page.');
    }
  }).catch(() => {
    // Ignorer les erreurs silencieusement
  });

  // Par défaut, utiliser ApiClient (optimiste)
  // Si le backend n'est pas disponible, les erreurs seront gérées par ApiClient
  return true;
};

/**
 * Export du client actif
 * En production, forcer l'utilisation d'ApiClient pour éviter LocalClient
 * Utilise ApiClient si configuré, sinon LocalClient (fallback uniquement en dev)
 */
const isProduction = import.meta.env.PROD || (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'));

// En production, toujours utiliser ApiClient (même si le backend n'est pas disponible immédiatement)
// Cela évite la création automatique d'un admin via LocalClient
// En développement, utiliser ApiClient par défaut si disponible, sinon LocalClient
export const client = (isProduction || useApiClientSync()) ? apiClient : localClient;

/**
 * Fonction pour vérifier et mettre à jour le client actif
 * Peut être appelée pour forcer une vérification de disponibilité
 */
export async function refreshClientAvailability(): Promise<void> {
  const available = await checkBackendAvailability();
  if (available) {
    logger.info('Backend disponible, ApiClient sera utilisé par défaut');
  } else {
    logger.warn('Backend non disponible, LocalClient sera utilisé en fallback');
  }
}

// Vérifier la disponibilité du backend au chargement du module
// Cela met à jour le cache pour les prochains chargements
if (typeof window !== 'undefined') {
  checkBackendAvailability()
    .then((available) => {
      if (available) {
        logger.info('Backend disponible, ApiClient sera utilisé par défaut');
      } else {
        logger.info('Backend non disponible, LocalClient sera utilisé en fallback');
      }
    })
    .catch(() => {
      // Ignorer les erreurs silencieusement au chargement
    });
}

/**
 * Type du client (pour TypeScript)
 */
export type Client = typeof client;

/**
 * Export séparé des clients pour un usage explicite si nécessaire
 */
export { localClient, apiClient };

/**
 * Fonction pour forcer l'utilisation d'un client spécifique
 * Utile pour les tests ou la migration progressive
 */
export function setClient(preferApi: boolean): void {
  // Note: Cette fonction nécessiterait une refactorisation pour être vraiment utile
  // Pour l'instant, utilisez directement `apiClient` ou `localClient` si vous voulez forcer l'un ou l'autre
  logger.warn('setClient() est déprécié. Utilisez directement apiClient ou localClient.');
}



