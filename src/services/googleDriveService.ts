/**
 * Service de gestion Google Drive (frontend)
 */

import { client } from '@/integrations/client';
import { logger } from '@/lib/logger';
import { handleServiceError } from './errorHandler';

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

export interface GoogleUser {
  email: string;
  name?: string;
  picture?: string;
}

export interface ShareResourceToGoogleDriveOptions {
  resourceId: string;
  folderId?: string;
  folderName?: string;
  createFolder?: boolean;
  sharePublic?: boolean;
}

export interface ShareResourceResult {
  success: boolean;
  folder: {
    id: string;
  } | null;
  files: Array<{
    id: string;
    name: string;
    url?: string;
  }>;
}

class GoogleDriveService {
  /**
   * Récupère les informations de l'utilisateur Google
   */
  async getUserInfo(): Promise<GoogleUser> {
    try {
      const response = await client.request('/api/google-drive/user', {
        method: 'GET',
      });

      if (response.error) {
        throw handleServiceError(response.error);
      }

      return response.data as GoogleUser;
    } catch (error) {
      logger.error('Erreur lors de la récupération des infos Google:', error);
      throw handleServiceError(error);
    }
  }

  /**
   * Liste les dossiers Google Drive de l'utilisateur avec pagination
   */
  async listFolders(
    parentId?: string,
    options?: {
      pageToken?: string;
      pageSize?: number;
      useCache?: boolean;
    }
  ): Promise<{ folders: GoogleDriveFolder[]; nextPageToken?: string }> {
    try {
      const params = new URLSearchParams();
      if (parentId) params.append('parentId', parentId);
      if (options?.pageToken) params.append('pageToken', options.pageToken);
      if (options?.pageSize) params.append('pageSize', String(options.pageSize));
      if (options?.useCache === false) params.append('useCache', 'false');

      const queryString = params.toString();
      const endpoint = `/api/google-drive/folders${queryString ? `?${queryString}` : ''}`;

      const response = await client.request(endpoint, {
        method: 'GET',
      });

      if (response.error) {
        throw handleServiceError(response.error);
      }

      return response.data as { folders: GoogleDriveFolder[]; nextPageToken?: string };
    } catch (error) {
      logger.error('Erreur lors de la récupération des dossiers:', error);
      throw handleServiceError(error);
    }
  }

  /**
   * Crée un nouveau dossier Google Drive
   */
  async createFolder(options: {
    name: string;
    parentId?: string;
  }): Promise<GoogleDriveFolder> {
    try {
      const response = await client.request('/api/google-drive/folders', {
        method: 'POST',
        body: options,
      });

      if (response.error) {
        throw handleServiceError(response.error);
      }

      return response.data as GoogleDriveFolder;
    } catch (error) {
      logger.error('Erreur lors de la création du dossier:', error);
      throw handleServiceError(error);
    }
  }

  /**
   * Partage une ressource vers Google Drive
   */
  async shareResource(options: ShareResourceToGoogleDriveOptions): Promise<ShareResourceResult> {
    try {
      const response = await client.request('/api/google-drive/share-resource', {
        method: 'POST',
        body: options,
      });

      if (response.error) {
        throw handleServiceError(response.error);
      }

      return response.data as ShareResourceResult;
    } catch (error) {
      logger.error('Erreur lors du partage vers Google Drive:', error);
      throw handleServiceError(error);
    }
  }
}

export const googleDriveService = new GoogleDriveService();

