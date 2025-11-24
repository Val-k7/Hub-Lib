/**
 * Types pour les suggestions et votes
 */

export type SuggestionStatus = 'pending' | 'approved' | 'rejected';
export type SuggestionType = 'category' | 'tag' | 'resource_type' | 'filter';
export type VoteType = 'upvote' | 'downvote' | null;

export interface Suggestion {
  id: string;
  name: string;
  description: string | null;
  type: SuggestionType;
  status: SuggestionStatus;
  votes_count: number;
  suggested_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SuggestionVote {
  id: string;
  suggestion_id: string;
  user_id: string;
  vote_type: 'upvote' | 'downvote';
  created_at: string;
}

export interface SuggestionWithVotes extends Suggestion {
  upvotes: number;
  downvotes: number;
  score: number;
  user_vote_type: VoteType;
}

