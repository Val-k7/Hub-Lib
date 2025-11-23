import { useCallback } from "react";
import { logger } from "@/lib/logger";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

/**
 * Hook pour gérer les erreurs de manière cohérente dans l'application
 * 
 * @example
 * ```tsx
 * const { handleError, showError } = useErrorHandler();
 * 
 * try {
 *   await someAsyncOperation();
 * } catch (error) {
 *   handleError(error, "Impossible de charger les données");
 * }
 * ```
 */
export function useErrorHandler() {
  const { user } = useAuth();

  /**
   * Gère une erreur en la loggant et en affichant un message utilisateur-friendly
   * 
   * @param error - L'erreur à gérer
   * @param userMessage - Message à afficher à l'utilisateur (optionnel)
   * @param context - Contexte supplémentaire pour le log (optionnel)
   */
  const handleError = useCallback(
    (
      error: unknown,
      userMessage?: string,
      context?: Record<string, any>
    ) => {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      // Logger l'erreur avec contexte
      logger.error(
        userMessage || errorObj.message || "Une erreur est survenue",
        errorObj,
        {
          ...context,
          userId: user?.id,
          userEmail: user?.email,
        }
      );

      // Afficher un toast à l'utilisateur
      toast({
        title: "Erreur",
        description:
          userMessage ||
          getErrorMessage(errorObj) ||
          "Une erreur inattendue s'est produite. Veuillez réessayer.",
        variant: "destructive",
      });
    },
    [user]
  );

  /**
   * Affiche simplement un message d'erreur sans logger
   */
  const showError = useCallback((message: string) => {
    toast({
      title: "Erreur",
      description: message,
      variant: "destructive",
    });
  }, []);

  /**
   * Affiche un message de succès
   */
  const showSuccess = useCallback((message: string) => {
    toast({
      title: "Succès",
      description: message,
    });
  }, []);

  return {
    handleError,
    showError,
    showSuccess,
  };
}

/**
 * Convertit une erreur en message utilisateur-friendly
 */
function getErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  // Messages d'erreur réseau
  if (message.includes("network") || message.includes("fetch")) {
    return "Problème de connexion. Vérifiez votre connexion internet.";
  }

  // Messages d'erreur d'authentification
  if (message.includes("auth") || message.includes("unauthorized")) {
    return "Vous devez être connecté pour effectuer cette action.";
  }

  // Messages d'erreur de permission
  if (message.includes("permission") || message.includes("forbidden")) {
    return "Vous n'avez pas la permission d'effectuer cette action.";
  }

  // Messages d'erreur de validation
  if (message.includes("validation") || message.includes("invalid")) {
    return "Les données fournies ne sont pas valides.";
  }

  // Message par défaut
  return error.message || "Une erreur inattendue s'est produite.";
}


