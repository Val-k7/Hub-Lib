import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { versioningService, type ResourceVersion } from '@/services/versioningService';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook pour récupérer les versions d'une ressource
 */
export function useResourceVersions(resourceId: string | null) {
  return useQuery({
    queryKey: ['resource-versions', resourceId],
    queryFn: () => {
      if (!resourceId) throw new Error('ID de ressource requis');
      return versioningService.getResourceVersions(resourceId);
    },
    enabled: !!resourceId,
  });
}

/**
 * Hook pour récupérer l'historique complet avec créateurs
 */
export function useResourceVersionHistory(resourceId: string | null) {
  return useQuery({
    queryKey: ['resource-version-history', resourceId],
    queryFn: () => {
      if (!resourceId) throw new Error('ID de ressource requis');
      return versioningService.getResourceVersionHistory(resourceId);
    },
    enabled: !!resourceId,
  });
}

/**
 * Hook pour créer une nouvelle version
 */
export function useCreateVersion() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      resourceId,
      resourceData,
      changeSummary,
    }: {
      resourceId: string;
      resourceData: Partial<Resource>;
      changeSummary?: string;
    }) => {
      if (!user) throw new Error('Utilisateur non connecté');
      return versioningService.createVersion(resourceId, resourceData, user.id, changeSummary);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resource-versions', variables.resourceId] });
      queryClient.invalidateQueries({ queryKey: ['resource-version-history', variables.resourceId] });
      toast({
        title: 'Version créée',
        description: 'Une nouvelle version a été enregistrée',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: getErrorMessage(error) || 'Impossible de créer la version',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook pour restaurer une version
 */
export function useRestoreVersion() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ resourceId, versionId }: { resourceId: string; versionId: string }) => {
      if (!user) throw new Error('Utilisateur non connecté');
      return versioningService.restoreToVersion(resourceId, versionId, user.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resource', variables.resourceId] });
      queryClient.invalidateQueries({ queryKey: ['resource-versions', variables.resourceId] });
      queryClient.invalidateQueries({ queryKey: ['resource-version-history', variables.resourceId] });
      toast({
        title: 'Version restaurée',
        description: 'La ressource a été restaurée à cette version',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de restaurer la version',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook pour comparer deux versions
 */
export function useCompareVersions() {
  return useMutation({
    mutationFn: ({ versionId1, versionId2 }: { versionId1: string; versionId2: string }) =>
      versioningService.compareVersions(versionId1, versionId2),
  });
}


