import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localClient } from "@/integrations/local/client";
import { useToast } from "@/hooks/use-toast";

export interface Group {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  added_at: string;
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export const useGroups = () => {
  return useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data, error } = await localClient
        .from("groups")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Group[];
    },
  });
};

export const useGroupMembers = (groupId: string) => {
  return useQuery({
    queryKey: ["group-members", groupId],
    queryFn: async () => {
      const { data, error } = await localClient
        .from("group_members")
        .select(`
          *,
          profiles!inner(username, full_name, avatar_url)
        `)
        .eq("group_id", groupId);

      if (error) throw error;
      return data as GroupMember[];
    },
    enabled: !!groupId,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (group: { name: string; description?: string }) => {
      const { data: { user } } = await localClient.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await localClient
        .from("groups")
        .insert({
          name: group.name,
          description: group.description,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      toast({
        title: "Groupe créé",
        description: "Le groupe a été créé avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de créer le groupe",
        variant: "destructive",
      });
    },
  });
};

export const useAddGroupMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ groupId, userId, role = "member" }: { groupId: string; userId: string; role?: string }) => {
      const { error } = await localClient
        .from("group_members")
        .insert({
          group_id: groupId,
          user_id: userId,
          role: role,
          added_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      toast({
        title: "Membre ajouté",
        description: "Le membre a été ajouté au groupe",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le membre",
        variant: "destructive",
      });
    },
  });
};

export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: string; userId: string }) => {
      const { error } = await localClient
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      toast({
        title: "Membre retiré",
        description: "Le membre a été retiré du groupe",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de retirer le membre",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateGroupMemberRole = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
      role,
    }: {
      groupId: string;
      userId: string;
      role: string;
    }) => {
      const { error } = await localClient
        .from("group_members")
        .update({ role })
        .eq("group_id", groupId)
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
      toast({
        title: "Rôle mis à jour",
        description: "Le rôle du membre a été modifié",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le rôle",
        variant: "destructive",
      });
    },
  });
};
