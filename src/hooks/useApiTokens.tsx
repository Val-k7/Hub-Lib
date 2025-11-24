import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { restApi, type ApiToken } from '@/api/rest';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook pour récupérer les tokens API d'un utilisateur
 */
export function useApiTokens() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['api-tokens', user?.id],
    queryFn: () => {
      if (!user) throw new Error('Utilisateur non connecté');
      return restApi.getUserTokens(user.id);
    },
    enabled: !!user,
  });
}

/**
 * Hook pour créer un token API
 */
export function useCreateApiToken() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ name, expiresInDays }: { name: string; expiresInDays?: number }) => {
      if (!user) throw new Error('Utilisateur non connecté');
      return restApi.createToken(user.id, name, expiresInDays);
    },
    onSuccess: (token) => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
      toast({
        title: 'Token créé',
        description: `Token "${token.name}" créé avec succès. Copiez-le maintenant, il ne sera plus affiché !`,
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erreur',
        description: getErrorMessage(error) || 'Impossible de créer le token',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook pour supprimer un token API
 */
export function useDeleteApiToken() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (tokenId: string) => {
      if (!user) throw new Error('Utilisateur non connecté');
      return restApi.deleteToken(tokenId, user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] });
      toast({
        title: 'Token supprimé',
        description: 'Le token a été supprimé avec succès',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer le token',
        variant: 'destructive',
      });
    },
  });
}


