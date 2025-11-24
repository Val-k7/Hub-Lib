/**
 * Service de validation des scopes OAuth
 */

import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../utils/logger.js';
import { oauthAccountService, OAuthProvider } from './oauthAccountService.js';

export interface RequiredScopes {
  github?: string[];
  google?: string[];
}

/**
 * Scopes requis pour les opérations GitHub
 */
export const GITHUB_SCOPES = {
  READ_REPOS: ['repo', 'public_repo'], // repo pour privé, public_repo pour public
  WRITE_REPOS: ['repo'], // Nécessite repo pour créer/modifier
  READ_USER: ['read:user', 'user:email'],
} as const;

/**
 * Scopes requis pour les opérations Google Drive
 */
export const GOOGLE_SCOPES = {
  READ_FILES: ['https://www.googleapis.com/auth/drive.readonly'],
  WRITE_FILES: ['https://www.googleapis.com/auth/drive.file'],
  FULL_ACCESS: ['https://www.googleapis.com/auth/drive'],
} as const;

class OAuthScopeValidator {
  /**
   * Vérifie si un compte OAuth a les scopes requis
   */
  async validateScopes(
    userId: string,
    provider: OAuthProvider,
    requiredScopes: string[]
  ): Promise<boolean> {
    try {
      const account = await oauthAccountService.getPrimaryOAuthAccount(userId, provider);
      if (!account) {
        return false;
      }

      // Vérifier si au moins un des scopes requis est présent
      const hasRequiredScope = requiredScopes.some((requiredScope) =>
        account.scope.some((userScope) => {
          // Pour GitHub, les scopes peuvent être séparés par des espaces ou des virgules
          // Pour Google, les scopes sont des URLs complètes
          if (provider === 'github') {
            // GitHub peut avoir des scopes comme "repo, user:email"
            return userScope.includes(requiredScope) || userScope === requiredScope;
          } else {
            // Google Drive utilise des URLs complètes
            return userScope === requiredScope || userScope.includes(requiredScope);
          }
        })
      );

      if (!hasRequiredScope) {
        logger.warn(`Scopes insuffisants pour ${provider}`, {
          userId,
          required: requiredScopes,
          available: account.scope,
        });
      }

      return hasRequiredScope;
    } catch (error) {
      logger.error(`Erreur lors de la validation des scopes pour ${provider}:`, error);
      return false;
    }
  }

  /**
   * Vérifie les scopes et lance une erreur si insuffisants
   */
  async requireScopes(
    userId: string,
    provider: OAuthProvider,
    requiredScopes: string[],
    operation: string
  ): Promise<void> {
    const hasScopes = await this.validateScopes(userId, provider, requiredScopes);
    
    if (!hasScopes) {
      const scopeList = requiredScopes.join(', ');
      throw new AppError(
        `Scopes OAuth insuffisants pour ${operation}. Scopes requis: ${scopeList}. Veuillez re-lier votre compte ${provider} avec les permissions appropriées.`,
        403,
        'INSUFFICIENT_OAUTH_SCOPES'
      );
    }
  }

  /**
   * Valide les scopes pour une opération GitHub
   */
  async validateGitHubScopes(userId: string, operation: 'read' | 'write' | 'read_user'): Promise<void> {
    let requiredScopes: string[];
    
    switch (operation) {
      case 'read':
        requiredScopes = [...GITHUB_SCOPES.READ_REPOS, ...GITHUB_SCOPES.READ_USER] as string[];
        break;
      case 'write':
        requiredScopes = [...GITHUB_SCOPES.WRITE_REPOS, ...GITHUB_SCOPES.READ_USER] as string[];
        break;
      case 'read_user':
        requiredScopes = [...GITHUB_SCOPES.READ_USER] as string[];
        break;
      default:
        requiredScopes = [...GITHUB_SCOPES.READ_USER] as string[];
    }

    await this.requireScopes(userId, 'github', requiredScopes, `GitHub ${operation}`);
  }

  /**
   * Valide les scopes pour une opération Google Drive
   */
  async validateGoogleDriveScopes(
    userId: string,
    operation: 'read' | 'write' | 'full'
  ): Promise<void> {
    let requiredScopes: string[];
    
    switch (operation) {
      case 'read':
        requiredScopes = [...GOOGLE_SCOPES.READ_FILES] as string[];
        break;
      case 'write':
        requiredScopes = [...GOOGLE_SCOPES.WRITE_FILES] as string[];
        break;
      case 'full':
        requiredScopes = [...GOOGLE_SCOPES.FULL_ACCESS] as string[];
        break;
      default:
        requiredScopes = [...GOOGLE_SCOPES.READ_FILES] as string[];
    }

    await this.requireScopes(userId, 'google', requiredScopes, `Google Drive ${operation}`);
  }
}

export const oauthScopeValidator = new OAuthScopeValidator();

