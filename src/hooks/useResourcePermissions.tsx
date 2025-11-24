import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { resourcePermissionsService, type CreateResourcePermissionPayload } from "@/services/resourcePermissionsService";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/types/errors";

export const useResourcePermissions = (resourceId: string) => {
  return useQuery({
    queryKey: ["resource-permissions", resourceId],
    queryFn: () => resourcePermissionsService.list(resourceId),
    enabled: !!resourceId,
  });
};

export const useCreateResourcePermission = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ resourceId, payload }: { resourceId: string; payload: CreateResourcePermissionPayload }) => {
      return resourcePermissionsService.create(resourceId, payload);
    },
    onSuccess: (_, { resourceId }) => {
      queryClient.invalidateQueries({ queryKey: ["resource-permissions", resourceId] });
      toast({
        title: "Permission ajoutée",
        description: "La permission a été créée avec succès.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erreur",
        description: getErrorMessage(error) || "Impossible d'ajouter la permission.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteResourcePermission = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ resourceId, permissionId }: { resourceId: string; permissionId: string }) => {
      await resourcePermissionsService.remove(resourceId, permissionId);
    },
    onSuccess: (_, { resourceId }) => {
      queryClient.invalidateQueries({ queryKey: ["resource-permissions", resourceId] });
      toast({
        title: "Permission supprimée",
        description: "La permission a été supprimée.",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erreur",
        description: getErrorMessage(error) || "Impossible de supprimer la permission.",
        variant: "destructive",
      });
    },
  });
};

