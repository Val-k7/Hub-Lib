import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionService, type Collection } from '@/services/collectionService';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook pour récupérer les collections d'un utilisateur
 */
export function useUserCollections(includePrivate: boolean = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['collections', 'user', user?.id, includePrivate],
    queryFn: () => {
      if (!user) throw new Error('Utilisateur non connecté');
      return collectionService.getUserCollections(user.id, includePrivate);
    },
    enabled: !!user,
  });
}

/**
 * Hook pour récupérer les collections publiques
 */
export function usePublicCollections(limit: number = 20) {
  return useQuery({
    queryKey: ['collections', 'public', limit],
    queryFn: () => collectionService.getPublicCollections(limit),
  });
}

/**
 * Hook pour récupérer une collection par ID
 */
export function useCollection(collectionId: string | null) {
  return useQuery({
    queryKey: ['collection', collectionId],
    queryFn: () => {
      if (!collectionId) throw new Error('ID de collection requis');
      return collectionService.getCollectionById(collectionId);
    },
    enabled: !!collectionId,
  });
}

/**
 * Hook pour créer une collection
 */
export function useCreateCollection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: {
      name: string;
      description?: string;
      is_public?: boolean;
      cover_image_url?: string;
    }) => {
      if (!user) throw new Error('Utilisateur non connecté');
      return collectionService.createCollection({ ...data, user_id: user.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast({
        title: 'Collection créée',
        description: 'Votre collection a été créée avec succès',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer la collection',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook pour mettre à jour une collection
 */
export function useUpdateCollection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ collectionId, updates }: {
      collectionId: string;
      updates: Partial<Pick<Collection, 'name' | 'description' | 'is_public' | 'cover_image_url'>>;
    }) => collectionService.updateCollection(collectionId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collection', variables.collectionId] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast({
        title: 'Collection mise à jour',
        description: 'Votre collection a été mise à jour',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de mettre à jour la collection',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook pour supprimer une collection
 */
export function useDeleteCollection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (collectionId: string) => collectionService.deleteCollection(collectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast({
        title: 'Collection supprimée',
        description: 'Votre collection a été supprimée',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer la collection',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook pour ajouter une ressource à une collection
 */
export function useAddResourceToCollection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ collectionId, resourceId }: { collectionId: string; resourceId: string }) =>
      collectionService.addResourceToCollection(collectionId, resourceId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collection', variables.collectionId] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast({
        title: 'Ressource ajoutée',
        description: 'La ressource a été ajoutée à la collection',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'ajouter la ressource',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook pour retirer une ressource d'une collection
 */
export function useRemoveResourceFromCollection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ collectionId, resourceId }: { collectionId: string; resourceId: string }) =>
      collectionService.removeResourceFromCollection(collectionId, resourceId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collection', variables.collectionId] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      toast({
        title: 'Ressource retirée',
        description: 'La ressource a été retirée de la collection',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de retirer la ressource',
        variant: 'destructive',
      });
    },
  });
}


