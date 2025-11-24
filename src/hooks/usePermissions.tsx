/**
 * Hook pour utiliser les permissions utilisateur
 * 
 * Ce hook est un wrapper autour du contexte PermissionsContext
 * pour faciliter l'utilisation dans les composants
 */

import { usePermissions as usePermissionsContext } from '@/contexts/PermissionsContext';
import type { AppRole } from '@/types/permissions';

/**
 * Hook pour accéder aux permissions de l'utilisateur
 * 
 * @returns {Object} Objet contenant les permissions, rôles et méthodes de vérification
 */
export const usePermissions = () => {
  return usePermissionsContext();
};

/**
 * Hook pour vérifier rapidement si l'utilisateur a un rôle spécifique
 * 
 * @param role - Rôle à vérifier
 * @returns {boolean} True si l'utilisateur a le rôle ou un rôle supérieur
 */
export const useHasRole = (role: AppRole): boolean => {
  const { hasRole } = usePermissionsContext();
  return hasRole(role);
};

/**
 * Hook pour vérifier rapidement si l'utilisateur a une permission spécifique
 * 
 * @param resource - Type de ressource (ex: 'resource', 'template')
 * @param action - Action requise (ex: 'read', 'write')
 * @returns {boolean} True si l'utilisateur a la permission
 */
export const useHasPermission = (resource: string, action: string): boolean => {
  const { hasPermission } = usePermissionsContext();
  return hasPermission(resource, action);
};

/**
 * Hook pour vérifier si l'utilisateur est admin
 * 
 * @returns {boolean} True si l'utilisateur est admin ou super_admin
 */
export const useIsAdmin = (): boolean => {
  const { hasRole } = usePermissionsContext();
  return hasRole('admin');
};

/**
 * Hook pour vérifier si l'utilisateur est super admin
 * 
 * @returns {boolean} True si l'utilisateur est super_admin
 */
export const useIsSuperAdmin = (): boolean => {
  const { hasRole } = usePermissionsContext();
  return hasRole('super_admin');
};

