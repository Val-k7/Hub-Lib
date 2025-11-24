/**
 * Context pour la gestion des permissions utilisateur
 * 
 * Fournit les permissions et rôles de l'utilisateur actuel avec cache local
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { client } from '@/integrations/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';
import type { AppRole, Permission, UserPermissions } from '@/types/permissions';

interface PermissionsContextType {
  userRole: AppRole | null;
  permissions: string[];
  hasPermission: (resource: string, action: string) => boolean;
  hasRole: (role: AppRole) => boolean;
  loading: boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

const CACHE_KEY = 'hub-lib-permissions';
const CACHE_TTL = 3600000; // 1 heure en millisecondes

interface CachedPermissions {
  userRole: AppRole | null;
  permissions: string[];
  cachedAt: number;
  expiresAt: number;
}

/**
 * Récupère les permissions depuis le cache local
 */
function getCachedPermissions(): CachedPermissions | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: CachedPermissions = JSON.parse(cached);
    const now = Date.now();

    // Vérifier si le cache est expiré
    if (now > data.expiresAt) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  } catch (error) {
    logger.warn('Erreur lors de la lecture du cache des permissions:', error);
    return null;
  }
}

/**
 * Met en cache les permissions
 */
function setCachedPermissions(userRole: AppRole | null, permissions: string[]): void {
  try {
    const now = Date.now();
    const data: CachedPermissions = {
      userRole,
      permissions,
      cachedAt: now,
      expiresAt: now + CACHE_TTL,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    logger.warn('Erreur lors de la mise en cache des permissions:', error);
  }
}

/**
 * Invalide le cache des permissions
 */
function invalidateCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    logger.warn('Erreur lors de l\'invalidation du cache:', error);
  }
}

/**
 * Récupère les permissions depuis l'API
 */
async function fetchUserPermissions(userId: string): Promise<UserPermissions> {
  const response = await client.request(`/api/permissions/user/${userId}`, {
    method: 'GET',
  });

  if (response.error) {
    throw new Error(response.error.message || 'Erreur lors de la récupération des permissions');
  }

  return response.data?.data || { userId, role: null, permissions: [] };
}

/**
 * Vérifie si un rôle est supérieur ou égal à un autre
 */
function compareRoles(userRole: AppRole | null, requiredRole: AppRole): boolean {
  if (!userRole) return false;

  const roleHierarchy: Record<AppRole, number> = {
    guest: 0,
    user: 1,
    moderator: 2,
    admin: 3,
    super_admin: 4,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export const PermissionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger depuis le cache au démarrage
  useEffect(() => {
    if (!user) {
      setUserRole(null);
      setPermissions([]);
      setLoading(false);
      invalidateCache();
      return;
    }

    const cached = getCachedPermissions();
    if (cached) {
      setUserRole(cached.userRole);
      setPermissions(cached.permissions);
      setLoading(false);
    }
  }, [user]);

  // Requête pour récupérer les permissions depuis l'API
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['user-permissions', user?.id],
    queryFn: async () => {
      if (!user) return null;
      return await fetchUserPermissions(user.id);
    },
    enabled: !!user,
    staleTime: CACHE_TTL, // Considérer les données comme fraîches pendant 1 heure
    gcTime: CACHE_TTL * 2, // Garder en cache pendant 2 heures
    retry: 1,
    retryDelay: 1000,
  });

  // Mettre à jour les permissions quand les données changent
  useEffect(() => {
    if (data) {
      setUserRole(data.role);
      setPermissions(data.permissions);
      setCachedPermissions(data.role, data.permissions);
      setLoading(false);
    } else if (!isLoading && !user) {
      setLoading(false);
    } else if (isLoading) {
      setLoading(true);
    }
  }, [data, isLoading, user]);

  // Invalider le cache quand l'utilisateur change
  useEffect(() => {
    if (!user) {
      invalidateCache();
    }
  }, [user]);

  /**
   * Vérifie si l'utilisateur a une permission spécifique
   */
  const hasPermission = (resource: string, action: string): boolean => {
    if (!userRole) return false;
    const permissionName = `${resource}:${action}`;
    return permissions.includes(permissionName);
  };

  /**
   * Vérifie si l'utilisateur a un rôle spécifique ou supérieur
   */
  const hasRole = (role: AppRole): boolean => {
    return compareRoles(userRole, role);
  };

  /**
   * Recharge les permissions depuis l'API
   */
  const refreshPermissions = async (): Promise<void> => {
    invalidateCache();
    await refetch();
  };

  const value: PermissionsContextType = {
    userRole,
    permissions,
    hasPermission,
    hasRole,
    loading,
    refreshPermissions,
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
};

/**
 * Hook pour utiliser le contexte de permissions
 */
export const usePermissions = (): PermissionsContextType => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions doit être utilisé dans un PermissionsProvider');
  }
  return context;
};

