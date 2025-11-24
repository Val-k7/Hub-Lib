/**
 * Service pour interagir avec l'API Google Drive
 */

import { logger } from '../utils/logger.js';
import { oauthAccountService } from './oauthAccountService.js';
import { AppError } from '../middleware/errorHandler.js';
import { oauthScopeValidator } from './oauthScopeValidator.js';
import { cacheService } from './cacheService.js';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
  createdTime?: string;
  modifiedTime?: string;
}

export interface GoogleDriveFolder {
  id: string;
  name: string;
  mimeType: 'application/vnd.google-apps.folder';
  webViewLink?: string;
  parents?: string[];
  createdTime?: string;
  modifiedTime?: string;
}

export interface CreateFolderOptions {
  name: string;
  parentId?: string;
}

export interface UploadFileOptions {
  name: string;
  content: string | Buffer;
  mimeType?: string;
  parentId?: string;
  description?: string;
}

class GoogleDriveService {
  /**
   * Rafraîchit un token Google OAuth
   */
  /**
   * Rafraîchit le token Google pour un utilisateur
   * Méthode publique pour permettre le rafraîchissement depuis les routes
   */
  async refreshGoogleTokenForUser(userId: string): Promise<void> {
    const account = await oauthAccountService.getPrimaryOAuthAccount(userId, 'google');
    if (!account) {
      throw new AppError('Aucun compte Google lié', 404, 'GOOGLE_ACCOUNT_NOT_FOUND');
    }

    const refreshToken = await oauthAccountService.getRefreshToken(account.id);
    if (!refreshToken) {
      throw new AppError(
        'Token expiré et aucun refresh token disponible. Veuillez re-lier votre compte Google.',
        401,
        'TOKEN_EXPIRED'
      );
    }

    const newTokens = await this.refreshGoogleToken(refreshToken);
    
    const tokenExpiresAt = newTokens.expires_in
      ? new Date(Date.now() + newTokens.expires_in * 1000)
      : undefined;

    await oauthAccountService.updateTokens(
      account.id,
      newTokens.access_token,
      newTokens.refresh_token || refreshToken,
      tokenExpiresAt
    );

    logger.info(`Token Google rafraîchi pour l'utilisateur ${userId}`);
  }

  private async refreshGoogleToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  }> {
    const { env } = await import('../config/env.js');
    
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new AppError('Configuration Google OAuth manquante', 500, 'OAUTH_CONFIG_ERROR');
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AppError(
        (errorData as any)?.error_description || 'Impossible de rafraîchir le token Google',
        response.status,
        'TOKEN_REFRESH_ERROR'
      );
    }

    const tokenData = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    if (!tokenData.access_token) {
      throw new AppError('Token d\'accès non reçu lors du rafraîchissement', 500, 'TOKEN_REFRESH_ERROR');
    }

    return tokenData;
  }

  /**
   * Récupère le token d'accès Google pour un utilisateur
   */
  private async getAccessToken(userId: string): Promise<string> {
    try {
      const account = await oauthAccountService.getPrimaryOAuthAccount(userId, 'google');
      if (!account) {
        throw new AppError('Aucun compte Google lié', 404, 'GOOGLE_ACCOUNT_NOT_FOUND');
      }

      // Vérifier si le token a expiré et le rafraîchir si nécessaire
      const needsRefresh = account.tokenExpiresAt && new Date(account.tokenExpiresAt) < new Date();
      
      if (needsRefresh) {
        const refreshToken = await oauthAccountService.getRefreshToken(account.id);
        if (!refreshToken) {
          throw new AppError(
            'Token expiré et aucun refresh token disponible. Veuillez re-lier votre compte Google.',
            401,
            'TOKEN_EXPIRED'
          );
        }

        try {
          // Rafraîchir le token
          const newTokens = await this.refreshGoogleToken(refreshToken);
          
          // Mettre à jour dans la base
          const tokenExpiresAt = newTokens.expires_in
            ? new Date(Date.now() + newTokens.expires_in * 1000)
            : undefined;

          await oauthAccountService.updateTokens(
            account.id,
            newTokens.access_token,
            newTokens.refresh_token || refreshToken, // Garder l'ancien si pas de nouveau
            tokenExpiresAt
          );

          logger.info(`Token Google rafraîchi pour l'utilisateur ${userId}`);
          return newTokens.access_token;
        } catch (error) {
          logger.error('Erreur lors du rafraîchissement du token Google:', error);
          throw new AppError(
            'Impossible de rafraîchir le token. Veuillez re-lier votre compte Google.',
            401,
            'TOKEN_REFRESH_FAILED'
          );
        }
      }

      return await oauthAccountService.getAccessToken(account.id);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Erreur lors de la récupération du token Google:', error);
      throw new AppError('Impossible de récupérer le token Google', 500, 'GOOGLE_TOKEN_ERROR');
    }
  }

  /**
   * Effectue une requête à l'API Google Drive
   */
  private async driveRequest(
    token: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const baseUrl = 'https://www.googleapis.com/drive/v3';
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = (errorData as any)?.error?.message || `Google Drive API error: ${response.statusText}`;
      logger.error('Erreur Google Drive API:', { status: response.status, message: errorMessage });
      throw new AppError(errorMessage, response.status, 'GOOGLE_DRIVE_API_ERROR');
    }

    return response.json();
  }

  /**
   * Effectue une requête multipart pour l'upload de fichiers
   */
  private async driveUploadRequest(
    token: string,
    metadata: { name: string; parents?: string[]; description?: string },
    content: string | Buffer,
    mimeType: string
  ): Promise<{ id: string; name: string; mimeType: string; webViewLink?: string }> {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const contentType = mimeType || 'application/octet-stream';
    const contentBuffer = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;

    const metadataPart = JSON.stringify(metadata);
    const multipartBody = Buffer.concat([
      Buffer.from(delimiter),
      Buffer.from('Content-Type: application/json\r\n\r\n'),
      Buffer.from(metadataPart),
      Buffer.from(delimiter),
      Buffer.from(`Content-Type: ${contentType}\r\n\r\n`),
      contentBuffer,
      Buffer.from(closeDelimiter),
    ]);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
      const errorMessage = errorData?.error?.message || `Google Drive API error: ${response.statusText}`;
      logger.error('Erreur Google Drive API (upload):', { status: response.status, message: errorMessage });
      throw new AppError(errorMessage, response.status, 'GOOGLE_DRIVE_API_ERROR');
    }

    const result = await response.json() as { id: string; name: string; mimeType: string; webViewLink?: string };
    return result;
  }

  /**
   * Récupère les informations de l'utilisateur Google
   */
  async getUserInfo(userId: string): Promise<{ email: string; name?: string; picture?: string }> {
    await oauthScopeValidator.validateGoogleDriveScopes(userId, 'read');
    const token = await this.getAccessToken(userId);
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new AppError('Impossible de récupérer les informations utilisateur', response.status, 'GOOGLE_API_ERROR');
    }

    const data = await response.json() as { email?: string; name?: string; picture?: string };
    if (!data.email) {
      throw new AppError('Email non disponible', 400, 'GOOGLE_API_ERROR');
    }

    return {
      email: data.email,
      name: data.name,
      picture: data.picture,
    };
  }

  /**
   * Liste les fichiers et dossiers dans un dossier
   */
  async listFiles(userId: string, options?: {
    folderId?: string;
    mimeType?: string;
    q?: string;
    pageSize?: number;
    pageToken?: string;
  }): Promise<{ files: GoogleDriveFile[]; nextPageToken?: string }> {
    await oauthScopeValidator.validateGoogleDriveScopes(userId, 'read');
    const token = await this.getAccessToken(userId);
    const params = new URLSearchParams();
    
    if (options?.folderId) {
      params.append('q', `'${options.folderId}' in parents and trashed=false`);
    } else if (options?.q) {
      params.append('q', options.q);
    } else {
      params.append('q', "trashed=false");
    }
    
    if (options?.mimeType) {
      const existingQ = params.get('q') || '';
      params.set('q', `${existingQ} and mimeType='${options.mimeType}'`);
    }
    
    params.append('fields', 'nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, parents, createdTime, modifiedTime)');
    params.append('pageSize', String(options?.pageSize || 100));
    
    if (options?.pageToken) {
      params.append('pageToken', options.pageToken);
    }

    return this.driveRequest(token, `/files?${params.toString()}`);
  }

  /**
   * Liste uniquement les dossiers avec pagination et cache
   */
  async listFolders(
    userId: string,
    parentId?: string,
    options?: {
      pageToken?: string;
      pageSize?: number;
      useCache?: boolean;
    }
  ): Promise<{ folders: GoogleDriveFolder[]; nextPageToken?: string }> {
    await oauthScopeValidator.validateGoogleDriveScopes(userId, 'read');
    
    // Générer une clé de cache
    const cacheKey = `googledrive:folders:${userId}:${parentId || 'root'}:${options?.pageToken || 'first'}`;
    
    // Essayer de récupérer depuis le cache si activé et première page
    if (options?.useCache !== false && !options?.pageToken) {
      const cached = await cacheService.get<{ folders: GoogleDriveFolder[]; nextPageToken?: string }>(cacheKey);
      if (cached) {
        logger.debug(`Cache hit pour les dossiers Google Drive de l'utilisateur ${userId}`);
        return cached;
      }
    }
    
    const result = await this.listFiles(userId, {
      folderId: parentId,
      mimeType: 'application/vnd.google-apps.folder',
      pageSize: options?.pageSize || 100,
      pageToken: options?.pageToken,
    });
    
    const foldersResult = {
      folders: result.files as GoogleDriveFolder[],
      nextPageToken: result.nextPageToken,
    };
    
    // Mettre en cache si première page (TTL: 5 minutes)
    if (options?.useCache !== false && !options?.pageToken) {
      await cacheService.set(cacheKey, foldersResult, { ttl: 300 });
    }
    
    return foldersResult;
  }

  /**
   * Crée un nouveau dossier
   */
  async createFolder(userId: string, options: CreateFolderOptions): Promise<GoogleDriveFolder> {
    await oauthScopeValidator.validateGoogleDriveScopes(userId, 'write');
    const token = await this.getAccessToken(userId);
    
    const metadata = {
      name: options.name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(options.parentId && { parents: [options.parentId] }),
    };

    return this.driveRequest(token, '/files', {
      method: 'POST',
      body: JSON.stringify(metadata),
    });
  }

  /**
   * Téléverse un fichier vers Google Drive
   */
  async uploadFile(userId: string, options: UploadFileOptions): Promise<GoogleDriveFile> {
    await oauthScopeValidator.validateGoogleDriveScopes(userId, 'write');
    const token = await this.getAccessToken(userId);
    
    const metadata: { name: string; parents?: string[]; description?: string } = {
      name: options.name,
      ...(options.parentId && { parents: [options.parentId] }),
      ...(options.description && { description: options.description }),
    };

    const mimeType = options.mimeType || 'text/plain';
    const content = typeof options.content === 'string' 
      ? Buffer.from(options.content, 'utf-8')
      : options.content;

    return this.driveUploadRequest(token, metadata, content, mimeType);
  }

  /**
   * Crée un fichier texte (document Google Docs)
   */
  async createTextFile(userId: string, name: string, content: string, parentId?: string): Promise<GoogleDriveFile> {
    await oauthScopeValidator.validateGoogleDriveScopes(userId, 'write');
    const token = await this.getAccessToken(userId);
    
    // Pour créer un document texte, on peut utiliser l'API avec mimeType text/plain
    // ou créer un Google Doc avec mimeType application/vnd.google-apps.document
    // On va créer un fichier texte simple pour plus de compatibilité
    
    return this.uploadFile(userId, {
      name,
      content,
      mimeType: 'text/plain',
      parentId,
    });
  }

  /**
   * Partage un fichier ou dossier
   */
  async shareFile(userId: string, fileId: string, role: 'reader' | 'writer' | 'commenter' = 'reader'): Promise<void> {
    await oauthScopeValidator.validateGoogleDriveScopes(userId, 'write');
    const token = await this.getAccessToken(userId);
    
    await this.driveRequest(token, `/files/${fileId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({
        role,
        type: 'anyone', // Permet à quiconque avec le lien d'accéder
      }),
    });
  }

  /**
   * Récupère les informations d'un fichier
   */
  async getFileInfo(userId: string, fileId: string): Promise<GoogleDriveFile> {
    const token = await this.getAccessToken(userId);
    
    return this.driveRequest(token, `/files/${fileId}?fields=id,name,mimeType,webViewLink,webContentLink,parents,createdTime,modifiedTime`);
  }

  /**
   * Supprime un fichier ou dossier
   */
  async deleteFile(userId: string, fileId: string): Promise<void> {
    const token = await this.getAccessToken(userId);
    
    await this.driveRequest(token, `/files/${fileId}`, {
      method: 'DELETE',
    });
  }
}

export const googleDriveService = new GoogleDriveService();

