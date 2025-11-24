/**
 * Service de gestion des comptes OAuth
 */

import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { AppError } from '../middleware/errorHandler.js';
import type { Prisma } from '@prisma/client';

export type OAuthProvider = 'github' | 'google';

export interface OAuthAccountData {
  provider: OAuthProvider;
  providerUserId: string;
  providerEmail?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  scope?: string[];
  metadata?: Record<string, any>;
  isPrimary?: boolean;
}

export interface OAuthAccount {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  providerEmail: string | null;
  scope: string[];
  metadata: Record<string, any> | null;
  isPrimary: boolean;
  tokenExpiresAt?: Date | null; // Ajouté pour vérifier l'expiration
  createdAt: Date;
  updatedAt: Date;
}

class OAuthAccountService {
  /**
   * Lie un compte OAuth à un utilisateur
   */
  async linkOAuthAccount(userId: string, data: OAuthAccountData): Promise<OAuthAccount> {
    try {
      // Vérifier si un compte avec le même provider et providerUserId existe déjà
      const existing = await prisma.oAuthAccount.findFirst({
        where: {
          provider: data.provider,
          providerUserId: data.providerUserId,
        },
      });

      if (existing && existing.userId !== userId) {
        throw new AppError(
          `Ce compte ${data.provider} est déjà lié à un autre utilisateur`,
          409,
          'OAUTH_ACCOUNT_ALREADY_LINKED'
        );
      }

      // Chiffrer les tokens
      const encryptedAccessToken = encrypt(data.accessToken);
      const encryptedRefreshToken = data.refreshToken ? encrypt(data.refreshToken) : null;

      // Si c'est le premier compte pour ce provider, le définir comme principal
      const existingAccounts = await prisma.oAuthAccount.findMany({
        where: {
          userId,
          provider: data.provider,
        },
      });

      const isPrimary = data.isPrimary ?? existingAccounts.length === 0;

      // Si on définit ce compte comme principal, retirer le statut principal des autres
      if (isPrimary) {
        await prisma.oAuthAccount.updateMany({
          where: {
            userId,
            provider: data.provider,
            isPrimary: true,
          },
          data: {
            isPrimary: false,
          },
        });
      }

      // Créer ou mettre à jour le compte OAuth
      const account = await prisma.oAuthAccount.upsert({
        where: {
          userId_provider_providerUserId: {
            userId,
            provider: data.provider,
            providerUserId: data.providerUserId,
          },
        },
        update: {
          providerEmail: data.providerEmail,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: data.tokenExpiresAt,
          scope: data.scope || [],
          metadata: data.metadata || {},
          isPrimary,
        },
        create: {
          userId,
          provider: data.provider,
          providerUserId: data.providerUserId,
          providerEmail: data.providerEmail,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt: data.tokenExpiresAt,
          scope: data.scope || [],
          metadata: data.metadata || {},
          isPrimary,
        },
      });

      logger.info(`Compte OAuth ${data.provider} lié pour l'utilisateur ${userId}`);

      return this.formatOAuthAccount(account);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erreur lors de la liaison du compte OAuth:', error);
      throw new AppError('Impossible de lier le compte OAuth', 500, 'OAUTH_LINK_ERROR');
    }
  }

  /**
   * Délie un compte OAuth
   */
  async unlinkOAuthAccount(userId: string, accountId: string): Promise<void> {
    try {
      const account = await prisma.oAuthAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new AppError('Compte OAuth non trouvé', 404, 'OAUTH_ACCOUNT_NOT_FOUND');
      }

      if (account.userId !== userId) {
        throw new AppError('Vous n\'êtes pas autorisé à délier ce compte', 403, 'UNAUTHORIZED');
      }

      await prisma.oAuthAccount.delete({
        where: { id: accountId },
      });

      logger.info(`Compte OAuth ${account.provider} délié pour l'utilisateur ${userId}`);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erreur lors du déliage du compte OAuth:', error);
      throw new AppError('Impossible de délier le compte OAuth', 500, 'OAUTH_UNLINK_ERROR');
    }
  }

  /**
   * Récupère tous les comptes OAuth d'un utilisateur
   */
  async getUserOAuthAccounts(userId: string): Promise<OAuthAccount[]> {
    try {
      const accounts = await prisma.oAuthAccount.findMany({
        where: { userId },
        orderBy: [
          { provider: 'asc' },
          { isPrimary: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      return accounts.map((account) => this.formatOAuthAccount(account));
    } catch (error) {
      logger.error('Erreur lors de la récupération des comptes OAuth:', error);
      throw new AppError('Impossible de récupérer les comptes OAuth', 500, 'OAUTH_FETCH_ERROR');
    }
  }

  /**
   * Récupère un compte OAuth par ID
   */
  async getOAuthAccountById(accountId: string): Promise<OAuthAccount | null> {
    try {
      const account = await prisma.oAuthAccount.findUnique({
        where: { id: accountId },
      });

      return account ? this.formatOAuthAccount(account) : null;
    } catch (error) {
      logger.error('Erreur lors de la récupération du compte OAuth:', error);
      throw new AppError('Impossible de récupérer le compte OAuth', 500, 'OAUTH_FETCH_ERROR');
    }
  }

  /**
   * Récupère le compte OAuth principal pour un provider
   */
  async getPrimaryOAuthAccount(userId: string, provider: OAuthProvider): Promise<OAuthAccount | null> {
    try {
      const account = await prisma.oAuthAccount.findFirst({
        where: {
          userId,
          provider,
          isPrimary: true,
        },
      });

      return account ? this.formatOAuthAccount(account) : null;
    } catch (error) {
      logger.error('Erreur lors de la récupération du compte OAuth principal:', error);
      throw new AppError('Impossible de récupérer le compte OAuth principal', 500, 'OAUTH_FETCH_ERROR');
    }
  }

  /**
   * Définit un compte OAuth comme principal
   */
  async setPrimaryOAuthAccount(userId: string, accountId: string): Promise<OAuthAccount> {
    try {
      const account = await prisma.oAuthAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        throw new AppError('Compte OAuth non trouvé', 404, 'OAUTH_ACCOUNT_NOT_FOUND');
      }

      if (account.userId !== userId) {
        throw new AppError('Vous n\'êtes pas autorisé à modifier ce compte', 403, 'UNAUTHORIZED');
      }

      // Retirer le statut principal des autres comptes du même provider
      await prisma.oAuthAccount.updateMany({
        where: {
          userId,
          provider: account.provider,
          isPrimary: true,
          id: { not: accountId },
        },
        data: {
          isPrimary: false,
        },
      });

      // Définir ce compte comme principal
      const updated = await prisma.oAuthAccount.update({
        where: { id: accountId },
        data: { isPrimary: true },
      });

      return this.formatOAuthAccount(updated);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erreur lors de la mise à jour du compte OAuth principal:', error);
      throw new AppError('Impossible de définir le compte principal', 500, 'OAUTH_UPDATE_ERROR');
    }
  }

  /**
   * Récupère un token d'accès déchiffré
   */
  async getAccessToken(accountId: string): Promise<string> {
    try {
      const account = await prisma.oAuthAccount.findUnique({
        where: { id: accountId },
        select: { accessToken: true },
      });

      if (!account) {
        throw new AppError('Compte OAuth non trouvé', 404, 'OAUTH_ACCOUNT_NOT_FOUND');
      }

      return decrypt(account.accessToken);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erreur lors de la récupération du token:', error);
      throw new AppError('Impossible de récupérer le token', 500, 'OAUTH_TOKEN_ERROR');
    }
  }

  /**
   * Récupère un refresh token déchiffré
   */
  async getRefreshToken(accountId: string): Promise<string | null> {
    try {
      const account = await prisma.oAuthAccount.findUnique({
        where: { id: accountId },
        select: { refreshToken: true },
      });

      if (!account) {
        throw new AppError('Compte OAuth non trouvé', 404, 'OAUTH_ACCOUNT_NOT_FOUND');
      }

      return account.refreshToken ? decrypt(account.refreshToken) : null;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erreur lors de la récupération du refresh token:', error);
      throw new AppError('Impossible de récupérer le refresh token', 500, 'OAUTH_TOKEN_ERROR');
    }
  }

  /**
   * Met à jour les tokens d'un compte OAuth
   */
  async updateTokens(accountId: string, accessToken: string, refreshToken?: string, tokenExpiresAt?: Date): Promise<void> {
    try {
      const encryptedAccessToken = encrypt(accessToken);
      const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : undefined;

      await prisma.oAuthAccount.update({
        where: { id: accountId },
        data: {
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt,
        },
      });

      logger.info(`Tokens OAuth mis à jour pour le compte ${accountId}`);
    } catch (error) {
      logger.error('Erreur lors de la mise à jour des tokens:', error);
      throw new AppError('Impossible de mettre à jour les tokens', 500, 'OAUTH_UPDATE_ERROR');
    }
  }

  /**
   * Formate un compte OAuth pour la réponse (sans les tokens)
   */
  private formatOAuthAccount(account: {
    id: string;
    userId: string;
    provider: string;
    providerUserId: string;
    providerEmail: string | null;
    scope: string[];
    metadata: Prisma.JsonValue | null;
    isPrimary: boolean;
    tokenExpiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): OAuthAccount {
    return {
      id: account.id,
      userId: account.userId,
      provider: account.provider as OAuthProvider,
      providerUserId: account.providerUserId,
      providerEmail: account.providerEmail,
      scope: account.scope,
      metadata: (account.metadata as Record<string, unknown> | null) ?? null,
      isPrimary: account.isPrimary,
      tokenExpiresAt: account.tokenExpiresAt ? new Date(account.tokenExpiresAt) : null,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }
}

export const oauthAccountService = new OAuthAccountService();

