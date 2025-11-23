/**
 * Adapter pour basculer entre LocalClient et ApiClient
 * Permet une migration progressive
 */

import { localClient } from './local/client.js';
import { apiClient } from './api/client.js';

/**
 * Détermine quel client utiliser
 * Peut être configuré via variable d'environnement ou feature flag
 */
const useApiClient = (): boolean => {
  // Vérifier la variable d'environnement
  if (import.meta.env.VITE_USE_API_CLIENT === 'true') {
    return true;
  }

  // Vérifier si le backend est disponible
  // Pour l'instant, on utilise la variable d'environnement uniquement
  return false;

  // TODO: Implémenter un check automatique de disponibilité du backend
  // const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  // try {
  //   const response = await fetch(`${apiUrl}/health`, { method: 'GET' });
  //   return response.ok;
  // } catch {
  //   return false;
  // }
};

/**
 * Export du client actif
 * Utilise ApiClient si configuré, sinon LocalClient (fallback)
 */
export const client = useApiClient() ? apiClient : localClient;

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
  console.warn('setClient() est déprécié. Utilisez directement apiClient ou localClient.');
}


