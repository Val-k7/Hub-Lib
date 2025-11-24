/**
 * Service de gestion GitHub (frontend)
 */

import { client } from '@/integrations/client';
import { logger } from '@/lib/logger';
import { handleServiceError } from './errorHandler';

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
}

export interface GitHubUser {
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}

export interface ShareResourceToGitHubOptions {
  resourceId: string;
  owner: string;
  repo: string;
  path?: string;
  branch?: string;
  createRepo?: boolean;
  repoDescription?: string;
  repoPrivate?: boolean;
}

export interface ShareResourceResult {
  success: boolean;
  repository: {
    owner: string;
    name: string;
    url: string;
  };
  commit: {
    sha: string;
    html_url: string;
  };
  files: string[];
}

class GitHubService {
  /**
   * Récupère les informations de l'utilisateur GitHub
   */
  async getUserInfo(): Promise<GitHubUser> {
    try {
      const response = await client.request('/api/github/user', {
        method: 'GET',
      });

      if (response.error) {
        throw handleServiceError(response.error);
      }

      return response.data as GitHubUser;
    } catch (error) {
      logger.error('Erreur lors de la récupération des infos GitHub:', error);
      throw handleServiceError(error);
    }
  }

  /**
   * Liste les repositories GitHub de l'utilisateur
   */
  async listRepositories(options?: {
    type?: 'all' | 'owner' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
  }): Promise<GitHubRepository[]> {
    try {
      const params = new URLSearchParams();
      if (options?.type) params.append('type', options.type);
      if (options?.sort) params.append('sort', options.sort);
      if (options?.direction) params.append('direction', options.direction);

      const queryString = params.toString();
      const endpoint = `/api/github/repositories${queryString ? `?${queryString}` : ''}`;

      const response = await client.request(endpoint, {
        method: 'GET',
      });

      if (response.error) {
        throw handleServiceError(response.error);
      }

      return response.data as GitHubRepository[];
    } catch (error) {
      logger.error('Erreur lors de la récupération des repositories:', error);
      throw handleServiceError(error);
    }
  }

  /**
   * Crée un nouveau repository GitHub
   */
  async createRepository(options: {
    name: string;
    description?: string;
    private?: boolean;
    auto_init?: boolean;
    gitignore_template?: string;
    license_template?: string;
  }): Promise<GitHubRepository> {
    try {
      const response = await client.request('/api/github/repositories', {
        method: 'POST',
        body: options,
      });

      if (response.error) {
        throw handleServiceError(response.error);
      }

      return response.data as GitHubRepository;
    } catch (error) {
      logger.error('Erreur lors de la création du repository:', error);
      throw handleServiceError(error);
    }
  }

  /**
   * Partage une ressource vers GitHub
   */
  async shareResource(options: ShareResourceToGitHubOptions): Promise<ShareResourceResult> {
    try {
      const response = await client.request('/api/github/share-resource', {
        method: 'POST',
        body: options,
      });

      if (response.error) {
        throw handleServiceError(response.error);
      }

      return response.data as ShareResourceResult;
    } catch (error) {
      logger.error('Erreur lors du partage vers GitHub:', error);
      throw handleServiceError(error);
    }
  }

  /**
   * Vérifie si un repository existe
   */
  async repositoryExists(owner: string, repo: string): Promise<boolean> {
    try {
      const response = await client.request(`/api/github/repositories/${owner}/${repo}/exists`, {
        method: 'GET',
      });

      if (response.error) {
        throw handleServiceError(response.error);
      }

      return (response.data as { exists: boolean }).exists;
    } catch (error) {
      logger.error('Erreur lors de la vérification du repository:', error);
      throw handleServiceError(error);
    }
  }
}

export const githubService = new GitHubService();

