import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localClient } from "@/integrations/local/client";
import { useToast } from "@/hooks/use-toast";

export interface Resource {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  resource_type: 'file_upload' | 'external_link' | 'github_repo';
  github_url: string | null;
  external_url: string | null;
  file_path: string | null;
  file_url: string | null;
  file_size: string | null;
  language: string | null;
  license: string;
  readme: string | null;
  average_rating: number;
  ratings_count: number;
  downloads_count: number;
  views_count: number;
  visibility: string;
  created_at: string;
  updated_at: string;
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useResources = (filters?: {
  searchQuery?: string;
  categories?: string[];
  tags?: string[];
}) => {
  return useQuery({
    queryKey: ["resources", filters],
    queryFn: async () => {
      let query = localClient
        .from("resources")
        .select(`
          *,
          profiles!inner(username, full_name, avatar_url)
        `)
        .order("created_at", { ascending: false });

      // Apply search filter
      if (filters?.searchQuery) {
        query = query.or(
          `title.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`
        );
      }

      // Apply category filter
      if (filters?.categories && filters.categories.length > 0) {
        query = query.in("category", filters.categories);
      }

      // Apply tag filter
      if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps("tags", filters.tags);
      }

      const { data, error } = await query.execute();

      if (error) throw error;
      return data as Resource[];
    },
  });
};

export const useResource = (id: string) => {
  const { toast } = useToast();
  
  return useQuery({
    queryKey: ["resource", id],
    queryFn: async () => {
      // Increment view count
      await localClient.rpc("increment_resource_views", { resource_id: id });

      const { data, error } = await localClient
        .from("resources")
        .select(`
          *,
          profiles!inner(username, full_name, avatar_url)
        `)
        .eq("id", id)
        .single();

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger la ressource",
          variant: "destructive",
        });
        throw error;
      }

      return data as Resource;
    },
    enabled: !!id,
  });
};

export const useSavedResources = () => {
  return useQuery({
    queryKey: ["saved-resources"],
    queryFn: async () => {
      const { data, error } = await localClient
        .from("saved_resources")
        .select(`
          resource_id,
          resources!inner(
            *,
            profiles!inner(username, full_name, avatar_url)
          )
        `)
        .order("created_at", { ascending: false })
        .execute();

      if (error) throw error;
      return data.map((item: any) => item.resources) as Resource[];
    },
  });
};

export const useToggleSaveResource = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      resourceId,
      isSaved,
    }: {
      resourceId: string;
      isSaved: boolean;
    }) => {
      if (isSaved) {
        // Unsave
        const { error } = await localClient
          .from("saved_resources")
          .delete()
          .eq("resource_id", resourceId);

        if (error) throw error;
      } else {
        // Save
        const {
          data: { user },
        } = await localClient.auth.getUser();
        
        if (!user) throw new Error("Not authenticated");

        const { error } = await localClient
          .from("saved_resources")
          .insert({ 
            resource_id: resourceId,
            user_id: user.id
          });

        if (error) throw error;
      }
    },
    onSuccess: (_, { isSaved }) => {
      queryClient.invalidateQueries({ queryKey: ["saved-resources"] });
      toast({
        title: isSaved ? "Ressource retirée" : "Ressource sauvegardée",
        description: isSaved
          ? "La ressource a été retirée de vos favoris"
          : "La ressource a été ajoutée à vos favoris",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue",
        variant: "destructive",
      });
    },
  });
};

export const useIncrementDownloads = () => {
  return useMutation({
    mutationFn: async (resourceId: string) => {
      await localClient.rpc("increment_resource_downloads", {
        resource_id: resourceId,
      });
    },
  });
};

export const useDeleteResource = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (resourceId: string) => {
      // Supprimer en cascade : ratings, shares, saved_resources
      await localClient
        .from("resource_ratings")
        .delete()
        .eq("resource_id", resourceId);

      await localClient
        .from("resource_shares")
        .delete()
        .eq("resource_id", resourceId);

      await localClient
        .from("saved_resources")
        .delete()
        .eq("resource_id", resourceId);

      // Supprimer la ressource
      const { error } = await localClient
        .from("resources")
        .delete()
        .eq("id", resourceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["my-resources"] });
      toast({
        title: "Ressource supprimée",
        description: "La ressource a été supprimée avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la ressource",
        variant: "destructive",
      });
    },
  });
};

export const useForkResource = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (resourceId: string) => {
      const { data: { user } } = await localClient.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Récupérer la ressource originale
      const { data: originalResource, error: fetchError } = await localClient
        .from("resources")
        .select("*")
        .eq("id", resourceId)
        .single();

      if (fetchError || !originalResource) throw fetchError || new Error("Resource not found");

      // Créer une copie
      const { data: newResource, error } = await localClient
        .from("resources")
        .insert({
          title: `${originalResource.title} (Fork)`,
          description: originalResource.description,
          category: originalResource.category,
          tags: originalResource.tags,
          resource_type: originalResource.resource_type,
          github_url: originalResource.github_url,
          external_url: originalResource.external_url,
          file_path: originalResource.file_path,
          file_url: originalResource.file_url,
          file_size: originalResource.file_size,
          language: originalResource.language,
          license: originalResource.license,
          readme: originalResource.readme,
          user_id: user.id,
          visibility: "public",
        })
        .select()
        .single();

      if (error) throw error;
      return newResource;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      queryClient.invalidateQueries({ queryKey: ["my-resources"] });
      toast({
        title: "Ressource dupliquée",
        description: "Vous pouvez maintenant modifier votre copie",
      });
      return data;
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de dupliquer la ressource",
        variant: "destructive",
      });
    },
  });
};
