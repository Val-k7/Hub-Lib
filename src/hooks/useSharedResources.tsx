import { useQuery } from "@tanstack/react-query";
import { localClient } from "@/integrations/local/client";
import type { Resource } from "./useResources";

export const useSharedWithMe = () => {
  return useQuery({
    queryKey: ["shared-with-me"],
    queryFn: async () => {
      const { data: { user } } = await localClient.auth.getUser();
      if (!user) return [];

      // Get resources shared directly with the user
      const { data: directShares, error: directError } = await localClient
        .from("resource_shares")
        .select(`
          resource_id,
          resources!inner(
            *,
            profiles!inner(username, full_name, avatar_url)
          )
        `)
        .eq("shared_with_user_id", user.id)
        .execute();

      if (directError) throw directError;

      // Get resources shared with user's groups
      const { data: groupShares, error: groupError } = await localClient
        .from("resource_shares")
        .select(`
          resource_id,
          resources!inner(
            *,
            profiles!inner(username, full_name, avatar_url)
          ),
          groups!inner(
            id,
            group_members!inner(user_id)
          )
        `)
        .not("shared_with_group_id", "is", null)
        .execute();

      if (groupError) throw groupError;

      // Filter group shares to only include groups the user is a member of
      const userGroupShares = groupShares?.filter((share: any) => 
        share.groups?.group_members?.some((member: any) => member.user_id === user.id)
      ) || [];

      // Combine and deduplicate resources
      const allResources = [
        ...(directShares?.map((s: any) => s.resources) || []),
        ...(userGroupShares.map((s: any) => s.resources) || [])
      ];

      // Remove duplicates by resource ID
      const uniqueResources = Array.from(
        new Map(allResources.map((r: any) => [r.id, r])).values()
      );

      return uniqueResources as Resource[];
    },
  });
};
