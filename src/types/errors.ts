/**
 * Types pour la gestion des erreurs
 */

/**
 * Erreur standard avec message
 */
export interface StandardError {
  message: string;
  code?: string;
  statusCode?: number;
}

/**
 * Type guard pour vérifier si une erreur a un message
 */
export function isErrorWithMessage(error: unknown): error is StandardError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Extrait le message d'erreur de manière sûre
 */
export function getErrorMessage(error: unknown): string {
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Erreur inconnue';
}

