import { useMutation, useQueryClient } from "@tanstack/react-query";
import { localClient } from "@/integrations/local/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { adminConfigService } from "@/services/adminConfigService";

type VoteType = "upvote" | "downvote" | null;

/**
 * Hook pour gérer le vote (upvote/downvote) sur les suggestions avec approbation automatique
 */
export const useSuggestionVoting = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      suggestionId, 
      voteType 
    }: { 
      suggestionId: string; 
      voteType: VoteType 
    }) => {
      if (!user) {
        throw new Error("Vous devez être connecté pour voter");
      }

      const { data: suggestions, error: fetchError } = await localClient
        .from("category_tag_suggestions")
        .select("*")
        .eq("id", suggestionId)
        .single()
        .execute();

      if (fetchError || !suggestions) {
        throw new Error("Suggestion non trouvée");
      }

      const suggestion = suggestions as any;

      // Vérifier si l'utilisateur a déjà voté
      const { data: existingVotes } = await localClient
        .from("suggestion_votes")
        .select("*")
        .eq("suggestion_id", suggestionId)
        .eq("user_id", user.id)
        .execute();

      const existingVote = existingVotes && existingVotes.length > 0 ? existingVotes[0] : null;
      const currentVoteType = existingVote?.vote_type || null;

      // Calculer les votes actuels (upvotes - downvotes)
      const { data: allVotes } = await localClient
        .from("suggestion_votes")
        .select("vote_type")
        .eq("suggestion_id", suggestionId)
        .execute();

      const upvotes = (allVotes || []).filter((v: any) => v.vote_type === "upvote").length;
      const downvotes = (allVotes || []).filter((v: any) => v.vote_type === "downvote").length;
      const currentScore = upvotes - downvotes;

      // Gérer le vote
      if (voteType === null && existingVote) {
        // Retirer le vote existant
        await localClient
          .from("suggestion_votes")
          .delete()
          .eq("id", existingVote.id)
          .execute();
      } else if (voteType && voteType !== currentVoteType) {
        if (existingVote) {
          // Mettre à jour le vote existant
          await localClient
            .from("suggestion_votes")
            .update({ vote_type: voteType })
            .eq("id", existingVote.id)
            .execute();
        } else {
          // Créer un nouveau vote
          await localClient
            .from("suggestion_votes")
            .insert({
              suggestion_id: suggestionId,
              user_id: user.id,
              vote_type: voteType,
            })
            .execute();
        }
      }

      // Recalculer les votes
      const { data: updatedVotes } = await localClient
        .from("suggestion_votes")
        .select("vote_type")
        .eq("suggestion_id", suggestionId)
        .execute();

      const newUpvotes = (updatedVotes || []).filter((v: any) => v.vote_type === "upvote").length;
      const newDownvotes = (updatedVotes || []).filter((v: any) => v.vote_type === "downvote").length;
      const newScore = newUpvotes - newDownvotes;
      const newVotesCount = newUpvotes + newDownvotes;

      // Mettre à jour le compteur de votes (score net)
      await localClient
        .from("category_tag_suggestions")
        .update({ votes_count: newScore })
        .eq("id", suggestionId)
        .execute();

      // Vérifier si le seuil d'approbation automatique est atteint
      const isAutoApprovalEnabled = await adminConfigService.isAutoApprovalEnabled();
      
      if (isAutoApprovalEnabled && suggestion.status === "pending") {
        const threshold = await adminConfigService.getVoteThreshold(suggestion.type);
        const downvoteThreshold = await adminConfigService.getDownvoteThreshold(suggestion.type);

        // Approbation automatique si score >= seuil
        if (newScore >= threshold) {
          await localClient
            .from("category_tag_suggestions")
            .update({
              status: "approved",
              reviewed_at: new Date().toISOString(),
              reviewed_by: null,
            })
            .eq("id", suggestionId)
            .execute();
        }
        // Rejet automatique si downvotes >= seuil
        else if (newDownvotes >= downvoteThreshold && newScore < 0) {
          await localClient
            .from("category_tag_suggestions")
            .update({
              status: "rejected",
              reviewed_at: new Date().toISOString(),
              reviewed_by: null,
            })
            .eq("id", suggestionId)
            .execute();
        }
      }

      return { 
        voteType: voteType || null, 
        score: newScore,
        upvotes: newUpvotes,
        downvotes: newDownvotes,
        totalVotes: newVotesCount
      };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["top-suggestions"] });
      
      if (variables.voteType === "upvote") {
        toast({
          title: "Vote positif enregistré",
          description: "Votre upvote a été pris en compte.",
        });
      } else if (variables.voteType === "downvote") {
        toast({
          title: "Vote négatif enregistré",
          description: "Votre downvote a été pris en compte.",
        });
      } else {
        toast({
          title: "Vote retiré",
          description: "Votre vote a été retiré.",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'enregistrer le vote",
        variant: "destructive",
      });
    },
  });
};

