import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localClient } from "@/integrations/local/client";
import { useToast } from "@/hooks/use-toast";

export interface Comment {
  id: string;
  resource_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  replies?: Comment[];
}

export const useComments = (resourceId: string) => {
  return useQuery({
    queryKey: ["comments", resourceId],
    queryFn: async () => {
      const { data, error } = await localClient
        .from("resource_comments")
        .select(`
          *,
          profiles!inner(username, full_name, avatar_url)
        `)
        .eq("resource_id", resourceId)
        .order("created_at", { ascending: true })
        .execute();

      if (error) throw error;

      // Organiser les commentaires en arbre (commentaires et réponses)
      const comments = data as Comment[];
      const commentMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      // Créer une map de tous les commentaires
      comments.forEach((comment) => {
        commentMap.set(comment.id, { ...comment, replies: [] });
      });

      // Organiser en arbre
      comments.forEach((comment) => {
        const commentWithReplies = commentMap.get(comment.id)!;
        if (comment.parent_id) {
          const parent = commentMap.get(comment.parent_id);
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(commentWithReplies);
          }
        } else {
          rootComments.push(commentWithReplies);
        }
      });

      return rootComments;
    },
    enabled: !!resourceId,
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      resourceId,
      content,
      parentId,
    }: {
      resourceId: string;
      content: string;
      parentId?: string | null;
    }) => {
      const { data: { user } } = await localClient.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await localClient
        .from("resource_comments")
        .insert({
          resource_id: resourceId,
          user_id: user.id,
          parent_id: parentId || null,
          content: content.trim(),
        })
        .select(`
          *,
          profiles!inner(username, full_name, avatar_url)
        `)
        .single();

      if (error) throw error;
      return data as Comment;
    },
    onSuccess: (_, { resourceId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", resourceId] });
      toast({
        title: "Commentaire ajouté",
        description: "Votre commentaire a été publié",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le commentaire",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      commentId,
      content,
      resourceId,
    }: {
      commentId: string;
      content: string;
      resourceId: string;
    }) => {
      const { error } = await localClient
        .from("resource_comments")
        .update({
          content: content.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: (_, { resourceId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", resourceId] });
      toast({
        title: "Commentaire modifié",
        description: "Votre commentaire a été mis à jour",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de modifier le commentaire",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      commentId,
      resourceId,
    }: {
      commentId: string;
      resourceId: string;
    }) => {
      // Supprimer aussi les réponses (cascade)
      const { data: replies } = await localClient
        .from("resource_comments")
        .select("id")
        .eq("parent_id", commentId);

      const idsToDelete = [commentId, ...(replies?.map((r) => r.id) || [])];

      for (const id of idsToDelete) {
        await localClient.from("resource_comments").delete().eq("id", id);
      }
    },
    onSuccess: (_, { resourceId }) => {
      queryClient.invalidateQueries({ queryKey: ["comments", resourceId] });
      toast({
        title: "Commentaire supprimé",
        description: "Le commentaire a été supprimé",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le commentaire",
        variant: "destructive",
      });
    },
  });
};

