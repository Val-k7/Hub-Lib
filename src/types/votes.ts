/**
 * Types pour les votes
 */

export type VoteType = 'upvote' | 'downvote';

export interface SuggestionVote {
  id: string;
  suggestion_id: string;
  user_id: string;
  vote_type: VoteType;
  created_at: string;
}

