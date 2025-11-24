/**
 * Composant pour protéger les routes selon les permissions
 * 
 * Utilise le nouveau système de permissions pour vérifier
 * les rôles et permissions avant d'afficher le contenu
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions, useHasRole, useHasPermission } from '@/hooks/usePermissions';
import type { AppRole } from '@/types/permissions';
import { PageLoader } from './LoadingStates';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Rôle minimum requis pour accéder à la route
   * Si spécifié, l'utilisateur doit avoir ce rôle ou un rôle supérieur
   */
  requiredRole?: AppRole;
  /**
   * Permission requise pour accéder à la route
   * Format: "resource:action" (ex: "resource:create")
   */
  requiredPermission?: string;
  /**
   * Si true, l'utilisateur doit être authentifié
   * Par défaut: true
   */
  requireAuth?: boolean;
  /**
   * URL de redirection si l'accès est refusé
   * Par défaut: "/auth" pour non authentifié, "/" pour permissions insuffisantes
   */
  redirectTo?: string;
  /**
   * Message à afficher pendant le chargement
   */
  loadingMessage?: string;
}

/**
 * Composant ProtectedRoute
 * 
 * Protège une route en vérifiant :
 * - L'authentification (si requireAuth = true)
 * - Le rôle (si requiredRole est spécifié)
 * - La permission (si requiredPermission est spécifié)
 * 
 * @example
 * ```tsx
 * // Route nécessitant l'authentification
 * <ProtectedRoute>
 *   <MyResources />
 * </ProtectedRoute>
 * 
 * // Route nécessitant le rôle admin
 * <ProtectedRoute requiredRole="admin">
 *   <AdminPanel />
 * </ProtectedRoute>
 * 
 * // Route nécessitant une permission spécifique
 * <ProtectedRoute requiredPermission="resource:create">
 *   <CreateResource />
 * </ProtectedRoute>
 * ```
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
  requiredPermission,
  requireAuth = true,
  redirectTo,
  loadingMessage = 'Vérification des permissions...',
}) => {
  const { user, loading: authLoading } = useAuth();
  const { loading: permissionsLoading } = usePermissions();
  const hasRole = useHasRole(requiredRole || 'guest');
  const hasPermission = useHasPermission(
    requiredPermission?.split(':')[0] || '',
    requiredPermission?.split(':')[1] || ''
  );

  // Afficher un loader pendant le chargement
  if (authLoading || permissionsLoading) {
    return <PageLoader message={loadingMessage} />;
  }

  // Vérifier l'authentification
  if (requireAuth && !user) {
    return <Navigate to={redirectTo || '/auth'} replace />;
  }

  // Vérifier le rôle si spécifié
  if (requiredRole && !hasRole) {
    return <Navigate to={redirectTo || '/'} replace />;
  }

  // Vérifier la permission si spécifiée
  if (requiredPermission && !hasPermission) {
    return <Navigate to={redirectTo || '/'} replace />;
  }

  // Tout est OK, afficher le contenu
  return <>{children}</>;
};

