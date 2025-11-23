import { useQuery } from "@tanstack/react-query";
import { localClient } from "@/integrations/local/client";

type SuggestionType = "category" | "tag" | "resource_type" | "filter";

interface TopSuggestion {
  id: string;
  name: string;
  type: SuggestionType;
  votes_count: number;
  status: "pending" | "approved" | "rejected";
}

/**
 * Hook pour récupérer les top suggestions par type
 */
export const useTopSuggestions = (type: SuggestionType, limit: number = 10) => {
  return useQuery({
    queryKey: ["top-suggestions", type, limit],
    queryFn: async () => {
      const { data, error } = await localClient
        .from("category_tag_suggestions")
        .select("*")
        .eq("type", type)
        .eq("status", "pending")
        .order("votes_count", { ascending: false })
        .limit(limit)
        .execute();

      if (error) throw error;

      return (data || []) as TopSuggestion[];
    },
  });
};

/**
 * Hook pour récupérer les top suggestions de tous les types
 */
export const useAllTopSuggestions = (limit: number = 8) => {
  const categorySuggestions = useTopSuggestions("category", limit);
  const tagSuggestions = useTopSuggestions("tag", limit);
  const resourceTypeSuggestions = useTopSuggestions("resource_type", limit);
  const filterSuggestions = useTopSuggestions("filter", limit);

  return {
    categories: categorySuggestions,
    tags: tagSuggestions,
    resourceTypes: resourceTypeSuggestions,
    filters: filterSuggestions,
  };
};

