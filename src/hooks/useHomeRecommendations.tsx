import { useQuery } from "@tanstack/react-query";
import { localClient } from "@/integrations/local/client";
import { templateService } from "@/services/templateService";
import { collectionService } from "@/services/collectionService";
import type { Resource } from "./useResources";

/**
 * Hook pour récupérer les ressources populaires
 * Triées par: views_count, downloads_count, ratings_count
 */
export const usePopularResources = (limit: number = 6) => {
  return useQuery({
    queryKey: ["popular-resources", limit],
    queryFn: async () => {
      const { data, error } = await localClient
        .from("resources")
        .select(`
          *,
          profiles!inner(username, full_name, avatar_url)
        `)
        .eq("visibility", "public")
        .order("views_count", { ascending: false })
        .limit(limit * 2) // Récupérer plus pour mieux trier
        .execute();

      if (error) throw error;

      // Trier par score de popularité combiné
      const sorted = (data as Resource[]).sort((a, b) => {
        const scoreA = (a.views_count || 0) * 1 + (a.downloads_count || 0) * 2 + (a.ratings_count || 0) * 3 + (a.average_rating || 0) * 10;
        const scoreB = (b.views_count || 0) * 1 + (b.downloads_count || 0) * 2 + (b.ratings_count || 0) * 3 + (b.average_rating || 0) * 10;
        return scoreB - scoreA;
      });

      return sorted.slice(0, limit);
    },
  });
};

/**
 * Hook pour récupérer les créations récentes
 * Triées par created_at décroissant
 */
export const useRecentResources = (limit: number = 6) => {
  return useQuery({
    queryKey: ["recent-resources", limit],
    queryFn: async () => {
      const { data, error } = await localClient
        .from("resources")
        .select(`
          *,
          profiles!inner(username, full_name, avatar_url)
        `)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(limit)
        .execute();

      if (error) throw error;
      return data as Resource[];
    },
  });
};

/**
 * Hook pour récupérer les templates suggérés
 */
export const useSuggestedTemplates = (limit: number = 6) => {
  return useQuery({
    queryKey: ["suggested-templates", limit],
    queryFn: async () => {
      return await templateService.getPopularTemplates(limit);
    },
  });
};

/**
 * Hook pour récupérer les collections publiques
 */
export const usePublicCollections = (limit: number = 6) => {
  return useQuery({
    queryKey: ["public-collections", limit],
    queryFn: async () => {
      return await collectionService.getPublicCollections(limit);
    },
  });
};

