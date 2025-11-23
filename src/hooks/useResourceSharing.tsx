import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localClient } from "@/integrations/local/client";
import { useToast } from "@/hooks/use-toast";

export type ResourceVisibility = "public" | "private" | "shared_users" | "shared_groups";

export type SharePermission = "read" | "write";
export type ResourceShareExpiration = string | null; // ISO date string

export interface ResourceShare {
  id: string;
  resource_id: string;
  shared_with_user_id: string | null;
  shared_with_group_id: string | null;
  permission: SharePermission;
  expires_at: ResourceShareExpiration;
  created_at: string;
}

export const useResourceShares = (resourceId: string) => {
  return useQuery({
    queryKey: ["resource-shares", resourceId],
    queryFn: async () => {
      const { data, error } = await localClient
        .from("resource_shares")
        .select("*")
        .eq("resource_id", resourceId);

      if (error) throw error;
      return data as ResourceShare[];
    },
    enabled: !!resourceId,
  });
};

export const useUpdateResourceVisibility = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      resourceId,
      visibility,
    }: {
      resourceId: string;
      visibility: ResourceVisibility;
    }) => {
      const { error } = await localClient
        .from("resources")
        .update({ visibility })
        .eq("id", resourceId);

      if (error) throw error;
    },
    onSuccess: (_, { resourceId }) => {
      queryClient.invalidateQueries({ queryKey: ["resource", resourceId] });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast({
        title: "Visibilité mise à jour",
        description: "La visibilité de la ressource a été modifiée",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la visibilité",
        variant: "destructive",
      });
    },
  });
};

export const useShareResource = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      resourceId,
      userId,
      groupId,
      permission = "read",
      expiresAt,
    }: {
      resourceId: string;
      userId?: string;
      groupId?: string;
      permission?: SharePermission;
      expiresAt?: string | null;
    }) => {
      const { error } = await localClient
        .from("resource_shares")
        .insert({
          resource_id: resourceId,
          shared_with_user_id: userId || null,
          shared_with_group_id: groupId || null,
          permission: permission,
          expires_at: expiresAt || null,
        });

      if (error) throw error;
    },
    onSuccess: (_, { resourceId }) => {
      queryClient.invalidateQueries({ queryKey: ["resource-shares", resourceId] });
      toast({
        title: "Ressource partagée",
        description: "La ressource a été partagée avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de partager la ressource",
        variant: "destructive",
      });
    },
  });
};

export const useUnshareResource = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (shareId: string) => {
      const { error } = await localClient
        .from("resource_shares")
        .delete()
        .eq("id", shareId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-shares"] });
      toast({
        title: "Partage annulé",
        description: "Le partage a été supprimé",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'annuler le partage",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateSharePermission = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      shareId,
      permission,
      expiresAt,
    }: {
      shareId: string;
      permission: SharePermission;
      expiresAt?: string | null;
    }) => {
      const updateData: any = { permission };
      if (expiresAt !== undefined) {
        updateData.expires_at = expiresAt;
      }

      const { error } = await localClient
        .from("resource_shares")
        .update(updateData)
        .eq("id", shareId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-shares"] });
      toast({
        title: "Permission mise à jour",
        description: "La permission a été modifiée",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la permission",
        variant: "destructive",
      });
    },
  });
};
