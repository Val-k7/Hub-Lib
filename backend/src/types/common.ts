/**
 * Types communs pour le backend
 */

import type { RedisOptions as IORedisOptions } from 'ioredis';

/**
 * Options Redis
 */
export type RedisOptions = IORedisOptions;

/**
 * Type pour les erreurs
 */
export type ErrorWithMessage = {
  message: string;
  code?: string;
  statusCode?: number;
};

/**
 * Type pour les métadonnées Google Drive
 */
export interface GoogleDriveFileMetadata {
  name: string;
  parents?: string[];
  description?: string;
  mimeType?: string;
}

/**
 * Type pour les réponses Google Drive API
 */
export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
}

/**
 * Type pour les votes de suggestions
 */
export interface SuggestionVoteResult {
  totalUpvotes: number;
  totalDownvotes: number;
  userVote: 'upvote' | 'downvote' | null;
}
