/**
 * Service unifié pour gérer les métadonnées (suggestions + existants)
 * Permet de voter sur les suggestions ET les éléments existants
 */

import { client } from '@/integrations/client';
import { metadataService } from './metadataService';

export type MetadataType = "category" | "tag" | "resource_type" | "filter";

export interface UnifiedMetadataItem {
  id: string;
  name: string;
  description: string | null;
  type: MetadataType;
  isSuggestion: boolean; // true si c'est une suggestion, false si c'est un élément existant
  status?: "pending" | "approved" | "rejected";
  votes_count: number;
  upvotes: number;
  downvotes: number;
  score: number;
  user_vote_type?: "upvote" | "downvote" | null;
  usage_count?: number; // Pour les éléments existants
  created_at: string;
}

class UnifiedMetadataService {
  /**
   * Récupère tous les éléments unifiés (suggestions + existants) pour un type donné
   */
  async getUnifiedItems(
    type: MetadataType,
    userId?: string
  ): Promise<UnifiedMetadataItem[]> {
    // Récupérer les suggestions
    const { data: suggestions, error: suggestionsError } = await client
      .from("category_tag_suggestions")
      .select("*")
      .eq("type", type)
      .eq("action", "add") // Uniquement les ajouts
      .order("votes_count", { ascending: false })
      .execute();

    if (suggestionsError) throw suggestionsError;

    // Récupérer les éléments existants (approuvés uniquement)
    const approvedSuggestions = (suggestions || []).filter(
      (s: any) => s.status === "approved"
    );

    // Récupérer les éléments existants depuis les ressources
    const existingItems = await metadataService.getMetadataWithUsage(type);

    // Combiner et mapper les suggestions
    const suggestionItems = await Promise.all(
      (suggestions || []).map(async (suggestion: any) => {
        // Récupérer les votes pour cette suggestion
        const { data: votes } = await client
          .from("suggestion_votes")
          .select("user_id, vote_type")
          .eq("suggestion_id", suggestion.id)
          .execute();

        const upvotes = (votes || []).filter((v: any) => v.vote_type === "upvote").length;
        const downvotes = (votes || []).filter((v: any) => v.vote_type === "downvote").length;
        const score = upvotes - downvotes;
        const userVote = userId && votes
          ? votes.find((v: any) => v.user_id === userId)
          : null;

        return {
          id: suggestion.id,
          name: suggestion.name,
          description: suggestion.description,
          type: suggestion.type,
          isSuggestion: true,
          status: suggestion.status,
          votes_count: suggestion.votes_count || score,
          upvotes,
          downvotes,
          score,
          user_vote_type: userVote?.vote_type || null,
          created_at: suggestion.created_at,
        } as UnifiedMetadataItem;
      })
    );

    // Créer des items virtuels pour les éléments existants (approuvés) qui ne sont pas déjà dans les suggestions
    const existingItemNames = new Set(
      approvedSuggestions.map((s: any) => s.name.toLowerCase())
    );
    const existingItemsToAdd = existingItems.filter(
      (item) => !existingItemNames.has(item.name.toLowerCase())
    );

    const existingItemsMapped: UnifiedMetadataItem[] = await Promise.all(
      existingItemsToAdd.map(async (item) => {
        // Chercher une suggestion approuvée correspondante pour les votes
        const { data: correspondingSuggestion } = await client
          .from("category_tag_suggestions")
          .select("id")
          .eq("type", item.type)
          .eq("name", item.name)
          .eq("status", "approved")
          .eq("action", "add")
          .single()
          .execute();

        let upvotes = 0;
        let downvotes = 0;
        let score = item.usage_count || 0;
        let userVote = null;

        if (correspondingSuggestion) {
          // Récupérer les votes sur cette suggestion
          const { data: votes } = await client
            .from("suggestion_votes")
            .select("user_id, vote_type")
            .eq("suggestion_id", correspondingSuggestion.id)
            .execute();

          upvotes = (votes || []).filter((v: any) => v.vote_type === "upvote").length;
          downvotes = (votes || []).filter((v: any) => v.vote_type === "downvote").length;
          score = upvotes - downvotes + (item.usage_count || 0); // Combiner votes et usage
          userVote = userId && votes
            ? votes.find((v: any) => v.user_id === userId)
            : null;

          return {
            id: correspondingSuggestion.id, // Utiliser l'ID de la suggestion pour permettre les votes
            name: item.name,
            description: `Élément existant utilisé ${item.usage_count} fois`,
            type: item.type,
            isSuggestion: false,
            status: "approved" as const,
            votes_count: score,
            upvotes,
            downvotes,
            score,
            user_vote_type: userVote?.vote_type || null,
            usage_count: item.usage_count,
            created_at: new Date().toISOString(),
          } as UnifiedMetadataItem;
        }

        // Pas de suggestion correspondante, créer un item virtuel
        return {
          id: `existing-${type}-${item.name}`,
          name: item.name,
          description: `Élément existant utilisé ${item.usage_count} fois`,
          type: item.type,
          isSuggestion: false,
          status: "approved" as const,
          votes_count: item.usage_count || 0,
          upvotes: 0,
          downvotes: 0,
          score: item.usage_count || 0,
          user_vote_type: null,
          usage_count: item.usage_count,
          created_at: new Date().toISOString(),
        } as UnifiedMetadataItem;
      })
    );

    // Combiner et trier par score
    const allItems = [...suggestionItems, ...existingItemsMapped];
    return allItems.sort((a, b) => b.score - a.score);
  }

  /**
   * Vote sur un élément unifié (suggestion ou existant)
   * Pour les éléments existants, cherche la suggestion approuvée correspondante ou en crée une
   */
  async voteOnItem(
    itemId: string,
    userId: string,
    voteType: "upvote" | "downvote" | null
  ): Promise<void> {
    let suggestionId = itemId;

    // Si c'est un élément existant (commence par "existing-"), trouver ou créer la suggestion approuvée
    if (itemId.startsWith("existing-")) {
      // Extraire le nom et le type depuis l'ID
      const parts = itemId.replace("existing-", "").split("-");
      const type = parts[0] as MetadataType;
      const name = parts.slice(1).join("-");

      // Chercher une suggestion approuvée existante avec ce nom et ce type
      const { data: existingSuggestion } = await client
        .from("category_tag_suggestions")
        .select("id")
        .eq("type", type)
        .eq("name", name)
        .eq("status", "approved")
        .eq("action", "add")
        .single()
        .execute();

      if (existingSuggestion) {
        suggestionId = existingSuggestion.id;
      } else {
        // Créer une suggestion approuvée pour cet élément existant
        const { data: newSuggestion } = await client
          .from("category_tag_suggestions")
          .insert({
            name: name,
            description: `Élément existant dans le système`,
            type: type,
            status: "approved",
            votes_count: 0,
            suggested_by: null,
            action: "add",
          })
          .select("id")
          .single()
          .execute();

        if (newSuggestion) {
          suggestionId = newSuggestion.id;
        } else {
          throw new Error("Impossible de créer la suggestion pour l'élément existant");
        }
      }
    }

    // Utiliser le système de votes normal sur la suggestion
    const { data: existingVotes } = await client
      .from("suggestion_votes")
      .select("*")
      .eq("suggestion_id", suggestionId)
      .eq("user_id", userId)
      .execute();

    const existingVote = existingVotes && existingVotes.length > 0 ? existingVotes[0] : null;

    if (voteType === null && existingVote) {
      // Retirer le vote
      await client
        .from("suggestion_votes")
        .delete()
        .eq("id", existingVote.id)
        .execute();
    } else if (voteType && voteType !== existingVote?.vote_type) {
      if (existingVote) {
        // Mettre à jour le vote
        await client
          .from("suggestion_votes")
          .update({ vote_type: voteType })
          .eq("id", existingVote.id)
          .execute();
      } else {
        // Créer un nouveau vote
        await client
          .from("suggestion_votes")
          .insert({
            suggestion_id: suggestionId,
            user_id: userId,
            vote_type: voteType,
          })
          .execute();
      }
    }

    // Recalculer le score
    const { data: votes } = await client
      .from("suggestion_votes")
      .select("vote_type")
      .eq("suggestion_id", suggestionId)
      .execute();

    const upvotes = (votes || []).filter((v: any) => v.vote_type === "upvote").length;
    const downvotes = (votes || []).filter((v: any) => v.vote_type === "downvote").length;
    const score = upvotes - downvotes;

    // Mettre à jour le compteur de votes
    await client
      .from("category_tag_suggestions")
      .update({ votes_count: score })
      .eq("id", suggestionId)
      .execute();
  }
}

export const unifiedMetadataService = new UnifiedMetadataService();

