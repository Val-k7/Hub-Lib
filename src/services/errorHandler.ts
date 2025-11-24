/**
 * Gestionnaire d'erreurs pour les services frontend
 * Permet une gestion cohérente des erreurs dans les services (qui ne peuvent pas utiliser useErrorHandler)
 */

import { logger } from '@/lib/logger';

/**
 * Classe d'erreur personnalisée pour les services
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

/**
 * Gère une erreur dans un service
 * Log l'erreur et retourne une ServiceError typée
 * 
 * @param error - L'erreur à gérer
 * @param defaultMessage - Message par défaut si l'erreur n'en a pas
 * @param context - Contexte supplémentaire pour le log
 * @returns ServiceError typée
 */
export function handleServiceError(
  error: unknown,
  defaultMessage: string = 'Une erreur est survenue',
  context?: Record<string, any>
): ServiceError {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  // Logger l'erreur avec contexte
  logger.error(
    defaultMessage,
    errorObj instanceof Error ? errorObj : new Error(String(errorObj)),
    context
  );

  // Extraire le code d'erreur si c'est une ServiceError
  if (error instanceof ServiceError) {
    return error;
  }

  // Créer une ServiceError à partir de l'erreur
  return new ServiceError(
    errorObj.message || defaultMessage,
    undefined,
    undefined,
    context
  );
}

/**
 * Wrapper pour les fonctions async qui gère automatiquement les erreurs
 * 
 * @param fn - Fonction async à wrapper
 * @param errorMessage - Message d'erreur par défaut
 * @returns Résultat de la fonction ou null en cas d'erreur
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorMessage: string = 'Une erreur est survenue'
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    handleServiceError(error, errorMessage);
    return null;
  }
}

/**
 * Wrapper pour les fonctions async qui propage les erreurs typées
 * 
 * @param fn - Fonction async à wrapper
 * @param errorMessage - Message d'erreur par défaut
 * @returns Résultat de la fonction
 * @throws ServiceError
 */
export async function withTypedErrorHandling<T>(
  fn: () => Promise<T>,
  errorMessage: string = 'Une erreur est survenue'
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw handleServiceError(error, errorMessage);
  }
}

