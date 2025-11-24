import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/types/errors";
import {
  resourceSharingService,
  type ShareResourcePayload,
  type UpdateSharePayload,
} from "@/services/resourceSharingService";
import {
  type ResourceShare,
  type ResourceVisibility,
  type SharePermission,
  type ResourceShareExpiration,
} from "@/types/resourceSharing";

export type {
  ResourceShare,
  ResourceVisibility,
  SharePermission,
  ResourceShareExpiration,
} from "@/types/resourceSharing";

export const useResourceShares = (resourceId: string) => {
  return useQuery({
    queryKey: ["resource-shares", resourceId],
    queryFn: () => resourceSharingService.listShares(resourceId),
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
      await resourceSharingService.updateVisibility(resourceId, visibility);
    },
    onSuccess: (_, { resourceId }) => {
      queryClient.invalidateQueries({ queryKey: ["resource", resourceId] });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      toast({
        title: "Visibilité mise à jour",
        description: "La visibilité de la ressource a été modifiée",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erreur",
        description: getErrorMessage(error) || "Impossible de mettre à jour la visibilité",
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
      expiresAt?: ResourceShareExpiration;
    }) => {
      const payload: ShareResourcePayload = {
        sharedWithUserId: userId,
        sharedWithGroupId: groupId,
        permission,
        expiresAt: expiresAt ?? null,
      };
      await resourceSharingService.shareResource(resourceId, payload);
    },
    onSuccess: (_, { resourceId }) => {
      queryClient.invalidateQueries({ queryKey: ["resource-shares", resourceId] });
      toast({
        title: "Ressource partagée",
        description: "La ressource a été partagée avec succès",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erreur",
        description: getErrorMessage(error) || "Impossible de partager la ressource",
        variant: "destructive",
      });
    },
  });
};

export const useUnshareResource = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ resourceId, shareId }: { resourceId: string; shareId: string }) => {
      await resourceSharingService.deleteShare(resourceId, shareId);
    },
    onSuccess: (_, { resourceId }) => {
      queryClient.invalidateQueries({ queryKey: ["resource-shares", resourceId] });
      toast({
        title: "Partage annulé",
        description: "Le partage a été supprimé",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erreur",
        description: getErrorMessage(error) || "Impossible d'annuler le partage",
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
      expiresAt?: ResourceShareExpiration;
      resourceId: string;
    }) => {
      const payload: UpdateSharePayload = {
        permission,
        expiresAt: expiresAt ?? null,
      };
      await resourceSharingService.updateShare(resourceId, shareId, payload);
    },
    onSuccess: (_, { resourceId }) => {
      queryClient.invalidateQueries({ queryKey: ["resource-shares", resourceId] });
      toast({
        title: "Permission mise à jour",
        description: "La permission a été modifiée",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erreur",
        description: getErrorMessage(error) || "Impossible de mettre à jour la permission",
        variant: "destructive",
      });
    },
  });
};
