/**
 * Hook pour vérifier le rôle de l'utilisateur
 * 
 * Utilise maintenant le système de permissions avec cache
 * @deprecated Utilisez usePermissions() ou useIsAdmin() à la place
 */
import { usePermissions } from "./usePermissions";
import type { AppRole } from "@/types/permissions";

export const useUserRole = () => {
  const { userRole, hasRole, loading } = usePermissions();

  // Rétrocompatibilité : retourner isAdmin
  const isAdmin = hasRole('admin');

  return { 
    isAdmin, 
    loading,
    role: userRole,
    hasRole: (role: AppRole) => hasRole(role),
  };
};
