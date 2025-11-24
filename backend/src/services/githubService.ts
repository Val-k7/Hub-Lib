/**
 * Service pour interagir avec l'API GitHub
 */

import { logger } from '../utils/logger.js';
import { oauthAccountService } from './oauthAccountService.js';
import { AppError } from '../middleware/errorHandler.js';
import { oauthScopeValidator } from './oauthScopeValidator.js';
import { cacheService } from './cacheService.js';

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

export interface GitHubFile {
  path: string;
  content: string | Buffer; // Support pour string et Buffer
  encoding?: string;
}

export interface CreateRepositoryOptions {
  name: string;
  description?: string;
  private?: boolean;
  auto_init?: boolean;
  gitignore_template?: string;
  license_template?: string;
}

class GitHubService {
  /**
   * Rafraîchit un token GitHub OAuth (si supporté)
   * Note: GitHub ne supporte pas le refresh token pour les OAuth Apps classiques
   * Seules les GitHub Apps supportent le refresh token
   */
  private async refreshGitHubToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  }> {
    // GitHub OAuth Apps classiques ne supportent pas le refresh token
    // Il faudrait utiliser GitHub Apps pour avoir cette fonctionnalité
    throw new AppError(
      'GitHub ne supporte pas le rafraîchissement de token pour les OAuth Apps classiques. Veuillez re-lier votre compte.',
      401,
      'TOKEN_REFRESH_NOT_SUPPORTED'
    );
  }

  /**
   * Récupère le token d'accès GitHub pour un utilisateur
   */
  private async getAccessToken(userId: string): Promise<string> {
    try {
      const account = await oauthAccountService.getPrimaryOAuthAccount(userId, 'github');
      if (!account) {
        throw new AppError('Aucun compte GitHub lié', 404, 'GITHUB_ACCOUNT_NOT_FOUND');
      }

      // Note: GitHub OAuth Apps ne supportent pas l'expiration de tokens
      // Les tokens sont valides jusqu'à révocation manuelle
      // On ne vérifie pas l'expiration car GitHub ne la supporte pas pour les OAuth Apps classiques
      
      return await oauthAccountService.getAccessToken(account.id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erreur lors de la récupération du token GitHub:', error);
      throw new AppError('Impossible de récupérer le token GitHub', 500, 'GITHUB_TOKEN_ERROR');
    }
  }

  /**
   * Effectue une requête à l'API GitHub
   */
  private async githubRequest(
    token: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const baseUrl = 'https://api.github.com';
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Hub-Lib',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = (errorData as any)?.message || `GitHub API error: ${response.statusText}`;
      logger.error('Erreur GitHub API:', { status: response.status, message: errorMessage });
      throw new AppError(errorMessage, response.status, 'GITHUB_API_ERROR');
    }

    return response.json();
  }

  /**
   * Récupère les informations de l'utilisateur GitHub
   */
  async getUserInfo(userId: string): Promise<{ login: string; name?: string; email?: string }> {
    const token = await this.getAccessToken(userId);
    return this.githubRequest(token, '/user');
  }

  /**
   * Liste les repositories de l'utilisateur
   */
  async listRepositories(userId: string, options?: { type?: 'all' | 'owner' | 'member'; sort?: 'created' | 'updated' | 'pushed' | 'full_name'; direction?: 'asc' | 'desc' }): Promise<GitHubRepository[]> {
    const token = await this.getAccessToken(userId);
    const params = new URLSearchParams();
    
    if (options?.type) params.append('type', options.type);
    if (options?.sort) params.append('sort', options.sort);
    if (options?.direction) params.append('direction', options.direction);
    
    const queryString = params.toString();
    const endpoint = `/user/repos${queryString ? `?${queryString}` : ''}`;
    
    return this.githubRequest(token, endpoint);
  }

  /**
   * Crée un nouveau repository GitHub
   */
  async createRepository(userId: string, options: CreateRepositoryOptions): Promise<GitHubRepository> {
    const token = await this.getAccessToken(userId);
    
    return this.githubRequest(token, '/user/repos', {
      method: 'POST',
      body: JSON.stringify({
        name: options.name,
        description: options.description || '',
        private: options.private ?? false,
        auto_init: options.auto_init ?? true,
        gitignore_template: options.gitignore_template,
        license_template: options.license_template,
      }),
    });
  }

  /**
   * Vérifie si un repository existe
   */
  async repositoryExists(userId: string, owner: string, repo: string): Promise<boolean> {
    await oauthScopeValidator.validateGitHubScopes(userId, 'read');
    try {
      const token = await this.getAccessToken(userId);
      await this.githubRequest(token, `/repos/${owner}/${repo}`);
      return true;
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Crée ou met à jour un fichier dans un repository
   */
  async createOrUpdateFile(
    userId: string,
    owner: string,
    repo: string,
    path: string,
    content: string | Buffer,
    message: string,
    branch?: string
  ): Promise<{ commit: { sha: string; html_url: string } }> {
    const token = await this.getAccessToken(userId);
    
    // Récupérer le SHA du fichier s'il existe
    let sha: string | undefined;
    try {
      const fileInfo = await this.githubRequest(token, `/repos/${owner}/${repo}/contents/${path}${branch ? `?ref=${branch}` : ''}`);
      sha = fileInfo.sha;
    } catch (error) {
      // Le fichier n'existe pas, on va le créer
      if (error instanceof AppError && error.statusCode === 404) {
        sha = undefined;
      } else {
        throw error;
      }
    }

    // Encoder le contenu en base64
    // Gérer à la fois string et Buffer
    const contentBuffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
    const encodedContent = contentBuffer.toString('base64');

    return this.githubRequest(token, `/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: encodedContent,
        sha, // Inclure le SHA si on met à jour
        branch: branch || 'main',
      }),
    });
  }

  /**
   * Crée plusieurs fichiers dans un repository (via un commit)
   * Retourne aussi les informations nécessaires pour le rollback
   */
  async createMultipleFiles(
    userId: string,
    owner: string,
    repo: string,
    files: GitHubFile[],
    message: string,
    branch?: string
  ): Promise<{ 
    commit: { sha: string; html_url: string };
    rollbackInfo?: { baseCommitSha: string; createdFiles: string[] };
  }> {
    await oauthScopeValidator.validateGitHubScopes(userId, 'write');
    const token = await this.getAccessToken(userId);
    const defaultBranch = branch || 'main';

    // Récupérer la référence de la branche (pour rollback)
    const ref = await this.githubRequest(token, `/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`);
    const baseTreeSha = ref.object.sha;

    // Récupérer le commit actuel
    const commit = await this.githubRequest(token, `/repos/${owner}/${repo}/git/commits/${baseTreeSha}`);
    const baseTree = await this.githubRequest(token, `/repos/${owner}/${repo}/git/trees/${commit.tree.sha}`);

    // Créer les blobs pour chaque fichier
    // Gérer à la fois string et Buffer pour le contenu
    const tree = await Promise.all(
      files.map(async (file) => {
        // Si file.content est déjà une string, la convertir en Buffer puis base64
        // Si c'est un Buffer, l'utiliser directement
        const contentBuffer = typeof file.content === 'string' 
          ? Buffer.from(file.content, 'utf-8')
          : file.content;
        const encodedContent = contentBuffer.toString('base64');
        const blob = await this.githubRequest(token, `/repos/${owner}/${repo}/git/blobs`, {
          method: 'POST',
          body: JSON.stringify({
            content: encodedContent,
            encoding: 'base64',
          }),
        });

        return {
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blob.sha,
        };
      })
    );

    // Créer un nouvel arbre avec les nouveaux fichiers
    const newTree = await this.githubRequest(token, `/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      body: JSON.stringify({
        base_tree: commit.tree.sha,
        tree,
      }),
    });

    // Créer un nouveau commit
    const userInfo = await this.getUserInfo(userId);
    const newCommit = await this.githubRequest(token, `/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        tree: newTree.sha,
        parents: [baseTreeSha],
        author: {
          name: userInfo.name || userInfo.login,
          email: userInfo.email || `${userInfo.login}@users.noreply.github.com`,
        },
      }),
    });

    // Mettre à jour la référence de la branche
    await this.githubRequest(token, `/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`, {
      method: 'PATCH',
      body: JSON.stringify({
        sha: newCommit.sha,
      }),
    });

    return {
      commit: {
        sha: newCommit.sha,
        html_url: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
      },
      rollbackInfo: {
        baseCommitSha: baseTreeSha,
        createdFiles: files.map(f => f.path),
      },
    };
  }

  /**
   * Effectue un rollback en restaurant le commit précédent
   */
  async rollbackCommit(
    userId: string,
    owner: string,
    repo: string,
    previousCommitSha: string,
    branch?: string
  ): Promise<void> {
    await oauthScopeValidator.validateGitHubScopes(userId, 'write');
    const token = await this.getAccessToken(userId);
    const defaultBranch = branch || 'main';

    // Restaurer la référence de la branche au commit précédent
    await this.githubRequest(token, `/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`, {
      method: 'PATCH',
      body: JSON.stringify({
        sha: previousCommitSha,
      }),
    });
  }

  /**
   * Récupère le contenu d'un fichier depuis GitHub
   */
  async getFileContent(
    userId: string,
    owner: string,
    repo: string,
    path: string,
    branch?: string
  ): Promise<string> {
    const token = await this.getAccessToken(userId);
    const fileInfo = await this.githubRequest(token, `/repos/${owner}/${repo}/contents/${path}${branch ? `?ref=${branch}` : ''}`);
    
    // Décoder le contenu base64
    return Buffer.from(fileInfo.content, 'base64').toString('utf-8');
  }

  /**
   * Supprime un fichier d'un repository
   */
  async deleteFile(
    userId: string,
    owner: string,
    repo: string,
    path: string,
    message: string,
    branch?: string
  ): Promise<void> {
    const token = await this.getAccessToken(userId);
    
    // Récupérer le SHA du fichier
    const fileInfo = await this.githubRequest(token, `/repos/${owner}/${repo}/contents/${path}${branch ? `?ref=${branch}` : ''}`);
    
    await this.githubRequest(token, `/repos/${owner}/${repo}/contents/${path}`, {
      method: 'DELETE',
      body: JSON.stringify({
        message,
        sha: fileInfo.sha,
        branch: branch || 'main',
      }),
    });
  }
}

export const githubService = new GitHubService();

