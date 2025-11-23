/**
 * Service pour la gestion des ressources
 * Séparation de la logique métier du client local
 */

import { client } from '@/integrations/client';
import type { Resource } from '@/types/resource';

export interface ResourceFilters {
  searchQuery?: string;
  categories?: string[];
  tags?: string[];
  authorId?: string;
  language?: string;
  visibility?: 'public' | 'private';
  dateFrom?: string;
  dateTo?: string;
}

export interface ResourceService {
  getAll: (filters?: ResourceFilters) => Promise<Resource[]>;
  getById: (id: string) => Promise<Resource | null>;
  create: (resource: Partial<Resource>) => Promise<Resource>;
  update: (id: string, resource: Partial<Resource>) => Promise<Resource>;
  delete: (id: string) => Promise<void>;
  fork: (id: string, userId: string) => Promise<Resource>;
}

class ResourceServiceImpl implements ResourceService {
  async getAll(filters?: ResourceFilters): Promise<Resource[]> {
    let query = client.from('resources').select('*, profiles(*)');

    if (filters?.searchQuery) {
      const searchTerms = filters.searchQuery
        .toLowerCase()
        .split(' ')
        .filter((t) => t.length > 0);
      
      if (searchTerms.length > 0) {
        query = query.or(
          searchTerms
            .map((term) => `title.ilike.%${term}%,description.ilike.%${term}%,readme.ilike.%${term}%`)
            .join(',')
        );
      }
    }

    if (filters?.categories && filters.categories.length > 0) {
      query = query.in('category', filters.categories);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters?.authorId) {
      query = query.eq('user_id', filters.authorId);
    }

    if (filters?.language) {
      query = query.eq('language', filters.language);
    }

    if (filters?.visibility) {
      query = query.eq('visibility', filters.visibility);
    }

    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).execute();

    if (error) {
      throw new Error(`Erreur lors de la récupération des ressources: ${error.message}`);
    }

    return data || [];
  }

  async getById(id: string): Promise<Resource | null> {
    const { data, error } = await client
      .from('resources')
      .select('*, profiles(*)')
      .eq('id', id)
      .single()
      .execute();

    if (error) {
      if (error.message === 'No rows found') {
        return null;
      }
      throw new Error(`Erreur lors de la récupération de la ressource: ${error.message}`);
    }

    return data;
  }

  async create(resource: Partial<Resource>): Promise<Resource> {
    const { data, error } = await client
      .from('resources')
      .insert(resource)
      .select('*, profiles(*)')
      .single()
      .execute();

    if (error) {
      throw new Error(`Erreur lors de la création de la ressource: ${error.message}`);
    }

    return data;
  }

  async update(id: string, resource: Partial<Resource>): Promise<Resource> {
    const { data, error } = await client
      .from('resources')
      .update(resource)
      .eq('id', id)
      .select('*, profiles(*)')
      .single()
      .execute();

    if (error) {
      throw new Error(`Erreur lors de la mise à jour de la ressource: ${error.message}`);
    }

    return data;
  }

  async delete(id: string): Promise<void> {
    // Suppression en cascade
    await client.from('resource_ratings').delete().eq('resource_id', id).execute();
    await client.from('resource_shares').delete().eq('resource_id', id).execute();
    await client.from('saved_resources').delete().eq('resource_id', id).execute();
    await client.from('resource_comments').delete().eq('resource_id', id).execute();

    const { error } = await client.from('resources').delete().eq('id', id).execute();

    if (error) {
      throw new Error(`Erreur lors de la suppression de la ressource: ${error.message}`);
    }
  }

  async fork(id: string, userId: string): Promise<Resource> {
    const original = await this.getById(id);
    if (!original) {
      throw new Error('Ressource non trouvée');
    }

    const forkedResource = {
      ...original,
      id: undefined,
      user_id: userId,
      title: `${original.title} (Fork)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      views_count: 0,
      downloads_count: 0,
      ratings_count: 0,
      average_rating: 0,
    };

    return this.create(forkedResource);
  }
}

export const resourceService: ResourceService = new ResourceServiceImpl();


