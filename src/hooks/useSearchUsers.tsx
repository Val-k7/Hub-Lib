import { useQuery } from "@tanstack/react-query";
import { localClient } from "@/integrations/local/client";

export interface SearchUser {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export const useSearchUsers = (query: string) => {
  return useQuery({
    queryKey: ["search-users", query],
    queryFn: async () => {
      const { data, error } = await localClient.searchUsers(query);
      if (error) throw error;
      return data as SearchUser[];
    },
    enabled: query.length >= 2,
    staleTime: 1000 * 60, // 1 minute
  });
};

