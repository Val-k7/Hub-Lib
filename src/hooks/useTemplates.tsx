import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templateService, type ResourceTemplate } from '@/services/templateService';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook pour gérer les templates de ressources
 */
export function useTemplates() {
  const { toast } = useToast();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templateService.getPublicTemplates(),
  });

  const { data: popularTemplates } = useQuery({
    queryKey: ['templates', 'popular'],
    queryFn: () => templateService.getPopularTemplates(10),
  });

  return {
    templates: templates || [],
    popularTemplates: popularTemplates || [],
    isLoading,
  };
}

/**
 * Hook pour créer une ressource depuis un template
 */
export function useCreateFromTemplate() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, customizations }: { 
      templateId: string; 
      customizations?: Partial<any> 
    }) => {
      if (!user) {
        throw new Error('Vous devez être connecté');
      }
      return templateService.createResourceFromTemplate(templateId, user.id, customizations);
    },
    onSuccess: (resource) => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast({
        title: 'Ressource créée !',
        description: 'Votre ressource a été créée depuis le template',
      });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Erreur',
        description: getErrorMessage(error) || 'Impossible de créer la ressource',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook pour rechercher des templates
 */
export function useSearchTemplates() {
  return useMutation({
    mutationFn: (query: string) => templateService.searchTemplates(query),
  });
}


