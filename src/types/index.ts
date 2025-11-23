// ========================================
// HUBLIB - Shared TypeScript Types
// ========================================

/**
 * Database enum types
 */
export type AppRole = 'admin' | 'user';
export type SuggestionType = 'category' | 'tag';
export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

/**
 * User profile type
 */
export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  github_username: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Resource type (complete database representation)
 */
export interface Resource {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  github_url: string | null;
  file_url: string | null;
  file_size: string | null;
  language: string | null;
  license: string;
  readme: string | null;
  stars_count: number;
  forks_count: number;
  downloads_count: number;
  views_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

/**
 * Resource with author profile (for display)
 */
export interface ResourceWithAuthor extends Resource {
  profiles: Profile;
}

/**
 * Saved resource type
 */
export interface SavedResource {
  id: string;
  user_id: string;
  resource_id: string;
  created_at: string;
  resources?: Resource;
}

/**
 * Category/Tag suggestion type
 */
export interface CategoryTagSuggestion {
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

/**
 * Suggestion vote type
 */
export interface SuggestionVote {
  id: string;
  suggestion_id: string;
  user_id: string;
  created_at: string;
}

/**
 * User role type
 */
export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

/**
 * Form types
 */
export interface ResourceFormData {
  title: string;
  description: string;
  category: string;
  tags: string[];
  github_url: string;
  language: string;
  readme: string;
}

export interface SuggestionFormData {
  name: string;
  description: string;
  type: SuggestionType;
}

/**
 * Filter types
 */
export interface ResourceFilters {
  searchQuery?: string;
  categories?: string[];
  tags?: string[];
}

/**
 * Pagination types
 */
export interface PaginationParams {
  page: number;
  perPage: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
