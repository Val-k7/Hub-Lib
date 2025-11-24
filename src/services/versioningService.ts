/**
 * Service de gestion du versioning des ressources
 */

import { client } from '@/integrations/client';

export interface ResourceVersion {
  id: string;
  resource_id: string;
  version_number: number;
  title: string;
  description: string;
  category: string;
  tags: string[] | null;
  github_url: string | null;
  external_url: string | null;
  language: string | null;
  readme: string | null;
  file_path: string | null;
  file_url: string | null;
  file_size: string | null;
  created_by: string;
  created_at: string;
  change_summary: string | null;
}

class VersioningService {
  private readonly VERSIONS_TABLE = 'resource_versions';

  /**
   * Crée une nouvelle version d'une ressource
   */
  async createVersion(
    resourceId: string,
    resourceData: any,
    userId: string,
    changeSummary?: string
  ): Promise<ResourceVersion> {
    // Récupérer le numéro de version actuel
    const currentVersions = await this.getResourceVersions(resourceId);
    const nextVersion = currentVersions.length > 0 
      ? Math.max(...currentVersions.map(v => v.version_number)) + 1
      : 1;

    const version: Omit<ResourceVersion, 'id' | 'created_at'> = {
      resource_id: resourceId,
      version_number: nextVersion,
      title: resourceData.title,
      description: resourceData.description,
      category: resourceData.category,
      tags: resourceData.tags || null,
      github_url: resourceData.github_url || null,
      external_url: resourceData.external_url || null,
      language: resourceData.language || null,
      readme: resourceData.readme || null,
      file_path: resourceData.file_path || null,
      file_url: resourceData.file_url || null,
      file_size: resourceData.file_size || null,
      created_by: userId,
      change_summary: changeSummary || null,
    };

    const { data, error } = await client
      .from(this.VERSIONS_TABLE)
      .insert({
        ...version,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()
      .execute();

    if (error) {
      throw new Error(`Erreur lors de la création de la version: ${error.message}`);
    }

    return data;
  }

  /**
   * Récupère toutes les versions d'une ressource
   */
  async getResourceVersions(resourceId: string): Promise<ResourceVersion[]> {
    const { data, error } = await client
      .from(this.VERSIONS_TABLE)
      .select('*')
      .eq('resource_id', resourceId)
      .order('version_number', { ascending: false })
      .execute();

    if (error) {
      throw new Error(`Erreur lors de la récupération des versions: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Récupère une version spécifique
   */
  async getVersion(versionId: string): Promise<ResourceVersion | null> {
    const { data, error } = await client
      .from(this.VERSIONS_TABLE)
      .select('*')
      .eq('id', versionId)
      .single()
      .execute();

    if (error) {
      if (error.message?.includes('No rows')) {
        return null;
      }
      throw new Error(`Erreur lors de la récupération de la version: ${error.message}`);
    }

    return data;
  }

  /**
   * Compare deux versions d'une ressource
   */
  async compareVersions(versionId1: string, versionId2: string): Promise<{
    version1: ResourceVersion;
    version2: ResourceVersion;
    differences: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
  }> {
    const [version1, version2] = await Promise.all([
      this.getVersion(versionId1),
      this.getVersion(versionId2),
    ]);

    if (!version1 || !version2) {
      throw new Error('Une ou plusieurs versions introuvables');
    }

    const differences: Array<{ field: string; oldValue: any; newValue: any }> = [];

    const fieldsToCompare: (keyof ResourceVersion)[] = [
      'title',
      'description',
      'category',
      'tags',
      'github_url',
      'external_url',
      'language',
      'readme',
    ];

    fieldsToCompare.forEach((field) => {
      const oldValue = version1[field];
      const newValue = version2[field];
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        differences.push({
          field,
          oldValue,
          newValue,
        });
      }
    });

    return {
      version1,
      version2,
      differences,
    };
  }

  /**
   * Restaure une ressource à une version précédente
   */
  async restoreToVersion(resourceId: string, versionId: string, userId: string): Promise<void> {
    const version = await this.getVersion(versionId);
    if (!version) {
      throw new Error('Version introuvable');
    }

    if (version.resource_id !== resourceId) {
      throw new Error('La version ne correspond pas à la ressource');
    }

    // Récupérer la ressource actuelle
    const { data: resource, error: resourceError } = await client
      .from('resources')
      .select('*')
      .eq('id', resourceId)
      .single()
      .execute();

    if (resourceError || !resource) {
      throw new Error('Ressource introuvable');
    }

    // Créer une version de la ressource actuelle avant restauration
    await this.createVersion(
      resourceId,
      resource,
      userId,
      `Restauration vers la version ${version.version_number}`
    );

    // Restaurer la ressource à la version sélectionnée
    const { error: updateError } = await client
      .from('resources')
      .update({
        title: version.title,
        description: version.description,
        category: version.category,
        tags: version.tags,
        github_url: version.github_url,
        external_url: version.external_url,
        language: version.language,
        readme: version.readme,
        file_path: version.file_path,
        file_url: version.file_url,
        file_size: version.file_size,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resourceId)
      .execute();

    if (updateError) {
      throw new Error(`Erreur lors de la restauration: ${updateError.message}`);
    }
  }

  /**
   * Supprime une version (seulement si ce n'est pas la dernière)
   */
  async deleteVersion(versionId: string): Promise<void> {
    const version = await this.getVersion(versionId);
    if (!version) {
      throw new Error('Version introuvable');
    }

    // Vérifier que ce n'est pas la version la plus récente
    const allVersions = await this.getResourceVersions(version.resource_id);
    const latestVersion = allVersions[0];
    
    if (latestVersion && latestVersion.id === versionId) {
      throw new Error('Impossible de supprimer la version la plus récente');
    }

    const { error } = await client
      .from(this.VERSIONS_TABLE)
      .delete()
      .eq('id', versionId)
      .execute();

    if (error) {
      throw new Error(`Erreur lors de la suppression: ${error.message}`);
    }
  }

  /**
   * Récupère l'historique complet d'une ressource avec les créateurs
   */
  async getResourceVersionHistory(resourceId: string): Promise<Array<ResourceVersion & { creator?: any }>> {
    const versions = await this.getResourceVersions(resourceId);
    
    if (versions.length === 0) {
      return [];
    }

    const creatorIds = [...new Set(versions.map(v => v.created_by))];
    const { data: creators } = await client
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', creatorIds)
      .execute();

    return versions.map(version => ({
      ...version,
      creator: creators?.find(c => c.id === version.created_by),
    }));
  }
}

export const versioningService = new VersioningService();


