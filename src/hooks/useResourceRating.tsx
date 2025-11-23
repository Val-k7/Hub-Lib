import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localClient } from "@/integrations/local/client";
import { useToast } from "@/hooks/use-toast";

export const useResourceRating = (resourceId: string) => {
  return useQuery({
    queryKey: ["resource-rating", resourceId],
    queryFn: async () => {
      const { data: { user } } = await localClient.auth.getUser();
      if (!user) return null;

      const { data, error } = await localClient
        .from("resource_ratings")
        .select("rating")
        .eq("resource_id", resourceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data?.rating || null;
    },
    enabled: !!resourceId,
  });
};

export const useRateResource = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      resourceId,
      rating,
    }: {
      resourceId: string;
      rating: number;
    }) => {
      const { data: { user } } = await localClient.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await localClient
        .from("resource_ratings")
        .upsert({
          resource_id: resourceId,
          user_id: user.id,
          rating,
        }, {
          onConflict: "resource_id,user_id",
        });

      if (error) throw error;
    },
    onSuccess: (_, { resourceId }) => {
      queryClient.invalidateQueries({ queryKey: ["resource-rating", resourceId] });
      queryClient.invalidateQueries({ queryKey: ["resource", resourceId] });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast({
        title: "Merci !",
        description: "Votre note a été enregistrée",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer votre note",
        variant: "destructive",
      });
    },
  });
};
