/**
 * Service de gestion des collections de ressources
 */

import { client } from '@/integrations/client';

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  is_public: boolean;
  cover_image_url: string | null;
  resources_count: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionResource {
  id: string;
  collection_id: string;
  resource_id: string;
  added_at: string;
  order: number;
}

class CollectionService {
  private readonly COLLECTIONS_TABLE = 'collections';
  private readonly COLLECTION_RESOURCES_TABLE = 'collection_resources';

  /**
   * Crée une nouvelle collection
   */
  async createCollection(data: {
    name: string;
    description?: string;
    is_public?: boolean;
    cover_image_url?: string;
    user_id: string;
  }): Promise<Collection> {
    const collection: Omit<Collection, 'id' | 'created_at' | 'updated_at' | 'resources_count'> = {
      name: data.name,
      description: data.description || null,
      user_id: data.user_id,
      is_public: data.is_public ?? false,
      cover_image_url: data.cover_image_url || null,
    };

    const { data: created, error } = await client
      .from(this.COLLECTIONS_TABLE)
      .insert({
        ...collection,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        resources_count: 0,
      })
      .select()
      .single()
      .execute();

    if (error) {
      throw new Error(`Erreur lors de la création de la collection: ${error.message}`);
    }

    return created;
  }

  /**
   * Récupère toutes les collections d'un utilisateur
   */
  async getUserCollections(userId: string, includePrivate: boolean = true): Promise<Collection[]> {
    const query = client
      .from(this.COLLECTIONS_TABLE)
      .select('*')
      .eq('user_id', userId);

    if (!includePrivate) {
      query.eq('is_public', true);
    }

    const { data, error } = await query.order('updated_at', { ascending: false }).execute();

    if (error) {
      throw new Error(`Erreur lors de la récupération des collections: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Récupère les collections publiques
   */
  async getPublicCollections(limit: number = 20): Promise<Collection[]> {
    const { data, error } = await client
      .from(this.COLLECTIONS_TABLE)
      .select('*')
      .eq('is_public', true)
      .order('updated_at', { ascending: false })
      .limit(limit)
      .execute();

    if (error) {
      throw new Error(`Erreur lors de la récupération des collections publiques: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Récupère une collection par ID
   */
  async getCollectionById(collectionId: string): Promise<Collection | null> {
    const { data, error } = await client
      .from(this.COLLECTIONS_TABLE)
      .select('*')
      .eq('id', collectionId)
      .single()
      .execute();

    if (error) {
      if (error.message?.includes('No rows')) {
        return null;
      }
      throw new Error(`Erreur lors de la récupération de la collection: ${error.message}`);
    }

    return data;
  }

  /**
   * Met à jour une collection
   */
  async updateCollection(
    collectionId: string,
    updates: Partial<Pick<Collection, 'name' | 'description' | 'is_public' | 'cover_image_url'>>
  ): Promise<Collection> {
    const { data, error } = await client
      .from(this.COLLECTIONS_TABLE)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', collectionId)
      .select()
      .single()
      .execute();

    if (error) {
      throw new Error(`Erreur lors de la mise à jour de la collection: ${error.message}`);
    }

    return data;
  }

  /**
   * Supprime une collection
   */
  async deleteCollection(collectionId: string): Promise<void> {
    // Supprimer d'abord toutes les ressources de la collection
    await client
      .from(this.COLLECTION_RESOURCES_TABLE)
      .delete()
      .eq('collection_id', collectionId)
      .execute();

    // Supprimer la collection
    const { error } = await client
      .from(this.COLLECTIONS_TABLE)
      .delete()
      .eq('id', collectionId)
      .execute();

    if (error) {
      throw new Error(`Erreur lors de la suppression de la collection: ${error.message}`);
    }
  }

  /**
   * Ajoute une ressource à une collection
   */
  async addResourceToCollection(collectionId: string, resourceId: string): Promise<void> {
    // Vérifier si la ressource n'est pas déjà dans la collection
    const existing = await this.getCollectionResources(collectionId);
    if (existing.some(cr => cr.resource_id === resourceId)) {
      throw new Error('Cette ressource est déjà dans la collection');
    }

    // Récupérer l'ordre maximum
    const maxOrder = existing.length > 0 
      ? Math.max(...existing.map(cr => cr.order || 0))
      : 0;

    const { error } = await client
      .from(this.COLLECTION_RESOURCES_TABLE)
      .insert({
        collection_id: collectionId,
        resource_id: resourceId,
        added_at: new Date().toISOString(),
        order: maxOrder + 1,
      })
      .execute();

    if (error) {
      throw new Error(`Erreur lors de l'ajout de la ressource: ${error.message}`);
    }

    // Mettre à jour le compteur
    await this.updateCollectionResourcesCount(collectionId);
  }

  /**
   * Retire une ressource d'une collection
   */
  async removeResourceFromCollection(collectionId: string, resourceId: string): Promise<void> {
    const { error } = await client
      .from(this.COLLECTION_RESOURCES_TABLE)
      .delete()
      .eq('collection_id', collectionId)
      .eq('resource_id', resourceId)
      .execute();

    if (error) {
      throw new Error(`Erreur lors de la suppression de la ressource: ${error.message}`);
    }

    // Mettre à jour le compteur
    await this.updateCollectionResourcesCount(collectionId);
  }

  /**
   * Récupère les ressources d'une collection
   */
  async getCollectionResources(collectionId: string): Promise<CollectionResource[]> {
    const { data, error } = await client
      .from(this.COLLECTION_RESOURCES_TABLE)
      .select('*')
      .eq('collection_id', collectionId)
      .order('order', { ascending: true })
      .execute();

    if (error) {
      throw new Error(`Erreur lors de la récupération des ressources: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Récupère les ressources complètes d'une collection
   */
  async getCollectionResourcesWithDetails(collectionId: string): Promise<any[]> {
    const collectionResources = await this.getCollectionResources(collectionId);
    
    if (collectionResources.length === 0) {
      return [];
    }

    const resourceIds = collectionResources.map(cr => cr.resource_id);
    const { data: resources, error } = await client
      .from('resources')
      .select('*, profiles(*)')
      .in('id', resourceIds)
      .execute();

    if (error) {
      throw new Error(`Erreur lors de la récupération des ressources: ${error.message}`);
    }

    // Maintenir l'ordre
    const orderedResources = collectionResources
      .map(cr => resources?.find(r => r.id === cr.resource_id))
      .filter(Boolean);

    return orderedResources || [];
  }

  /**
   * Réorganise les ressources dans une collection
   */
  async reorderCollectionResources(
    collectionId: string,
    resourceOrders: Array<{ resource_id: string; order: number }>
  ): Promise<void> {
    const updates = resourceOrders.map(({ resource_id, order }) =>
      client
        .from(this.COLLECTION_RESOURCES_TABLE)
        .update({ order })
        .eq('collection_id', collectionId)
        .eq('resource_id', resource_id)
        .execute()
    );

    await Promise.all(updates);
  }

  /**
   * Met à jour le compteur de ressources d'une collection
   */
  private async updateCollectionResourcesCount(collectionId: string): Promise<void> {
    const resources = await this.getCollectionResources(collectionId);
    const count = resources.length;

    await client
      .from(this.COLLECTIONS_TABLE)
      .update({ resources_count: count })
      .eq('id', collectionId)
      .execute();
  }

  /**
   * Recherche des collections
   */
  async searchCollections(query: string, limit: number = 20): Promise<Collection[]> {
    const { data, error } = await client
      .from(this.COLLECTIONS_TABLE)
      .select('*')
      .eq('is_public', true)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('updated_at', { ascending: false })
      .limit(limit)
      .execute();

    if (error) {
      throw new Error(`Erreur lors de la recherche: ${error.message}`);
    }

    return data || [];
  }
}

export const collectionService = new CollectionService();


