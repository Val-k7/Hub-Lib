/**
 * QueryBuilder pour le client API
 * Traduit les requêtes en appels REST vers le backend
 */

import { ApiClient } from './client.js';
import type { ApiResponse } from './types.js';

/**
 * Mapping des tables vers les endpoints API
 */
const TABLE_TO_ENDPOINT: Record<string, string> = {
  resources: '/api/resources',
  profiles: '/api/profiles',
  collections: '/api/collections',
  'resource_comments': '/api/comments',
  groups: '/api/groups',
  notifications: '/api/notifications',
  'category_tag_suggestions': '/api/suggestions',
  'suggestion_votes': '/api/suggestions',
  'saved_resources': '/api/resources', // Endpoint spécial
  'resource_ratings': '/api/resources', // Endpoint spécial
  'resource_shares': '/api/resources', // Endpoint spécial
  'group_members': '/api/groups', // Endpoint spécial
};

/**
 * Builder de requêtes pour l'API
 */
export class ApiQueryBuilder {
  private client: ApiClient;
  private table: string;
  private filters: Array<{ type: string; field: string; value: any }> = [];
  private orderBy?: { field: string; ascending: boolean };
  private limitCount?: number;
  private offsetCount?: number;
  private selectFields?: string;
  private singleCalled: boolean = false;
  private insertedItem?: any;
  private updateData?: any;

  constructor(client: ApiClient, table: string) {
    this.client = client;
    this.table = table;
  }

  /**
   * Spécifie les champs à sélectionner
   */
  select(fields: string): this {
    this.selectFields = fields;
    return this;
  }

  /**
   * Filtre égalité
   */
  eq(field: string, value: any): this {
    this.filters.push({ type: 'eq', field, value });
    return this;
  }

  /**
   * Filtre non égalité
   */
  neq(field: string, value: any): this {
    this.filters.push({ type: 'neq', field, value });
    return this;
  }

  /**
   * Filtre dans une liste
   */
  in(field: string, values: any[]): this {
    this.filters.push({ type: 'in', field, value: values });
    return this;
  }

  /**
   * Filtre NOT
   */
  not(field: string, operator: string, value: any): this {
    if (operator === 'is' && value === null) {
      this.filters.push({ type: 'notNull', field, value: null });
    }
    return this;
  }

  /**
   * Filtre OR (limité)
   */
  or(condition: string): this {
    this.filters.push({ type: 'or', field: '', value: condition });
    return this;
  }

  /**
   * Filtre overlaps (pour arrays)
   */
  overlaps(field: string, values: any[]): this {
    this.filters.push({ type: 'overlaps', field, value: values });
    return this;
  }

  /**
   * Tri
   */
  order(field: string, options?: { ascending: boolean }): this {
    this.orderBy = { field, ascending: options?.ascending ?? true };
    return this;
  }

  /**
   * Limite
   */
  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  /**
   * Offset pour pagination
   */
  range(from: number, to: number): this {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  /**
   * Insère un élément
   */
  insert(data: any): this {
    this.insertedItem = data;
    return this;
  }

  /**
   * Met à jour des éléments
   */
  update(data: any): Promise<{ error: any }> {
    this.updateData = data;
    return this.executeUpdate();
  }

  /**
   * Supprime des éléments
   */
  delete(): Promise<{ error: any }> {
    return this.executeDelete();
  }

  /**
   * Upsert (insert ou update)
   */
  upsert(data: any, options?: { onConflict?: string }): Promise<{ error: any }> {
    // Pour l'upsert, on essaie d'abord de mettre à jour, puis on insère si ça échoue
    return this.executeUpsert(data, options);
  }

  /**
   * Récupère un seul élément
   */
  single(): Promise<{ data: any; error: any }> {
    this.singleCalled = true;
    const result = this.execute();
    return result.then((response) => {
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        return { data: response.data[0], error: null };
      }
      return { data: null, error: { message: 'No rows found' } };
    });
  }

  /**
   * Récupère un seul élément ou null (pas d'erreur si aucun)
   */
  maybeSingle(): Promise<{ data: any; error: any }> {
    this.singleCalled = true;
    const result = this.execute();
    return result.then((response) => {
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        return { data: response.data[0], error: null };
      }
      return { data: null, error: null };
    });
  }

  /**
   * Exécute la requête SELECT
   */
  async execute(): Promise<ApiResponse<any>> {
    // Si on a un insert en attente
    if (this.insertedItem) {
      return this.executeInsert();
    }

    // Si on a un update en attente
    if (this.updateData !== undefined) {
      return this.executeUpdate();
    }

    // Requête GET
    const endpoint = this.getEndpoint();
    const params: Record<string, any> = {};

    // Convertir les filtres en paramètres
    this.filters.forEach((filter) => {
      switch (filter.type) {
        case 'eq':
          params[filter.field] = filter.value;
          break;
        case 'neq':
          params[`${filter.field}__ne`] = filter.value;
          break;
        case 'in':
          params[`${filter.field}__in`] = filter.value.join(',');
          break;
        case 'notNull':
          params[`${filter.field}__not_null`] = 'true';
          break;
        case 'overlaps':
          params[`${filter.field}__overlaps`] = filter.value.join(',');
          break;
      }
    });

    // Ajouter le tri
    if (this.orderBy) {
      params.sortBy = this.orderBy.field;
      params.sortOrder = this.orderBy.ascending ? 'asc' : 'desc';
    }

    // Ajouter la pagination
    if (this.limitCount) {
      params.limit = this.limitCount;
    }
    if (this.offsetCount !== undefined) {
      params.page = Math.floor(this.offsetCount / (this.limitCount || 20)) + 1;
    }

    // Gérer les cas spéciaux (GET by ID)
    const idFilter = this.filters.find((f) => f.type === 'eq' && f.field === 'id');
    if (idFilter && this.filters.length === 1) {
      // GET /api/resources/:id
      return this.client.request(`${endpoint}/${idFilter.value}`, {
        method: 'GET',
      });
    }

    return this.client.request(endpoint, {
      method: 'GET',
      params,
    });
  }

  /**
   * Exécute l'insertion
   */
  private async executeInsert(): Promise<ApiResponse<any>> {
    if (!this.insertedItem) {
      return {
        data: null,
        error: { message: 'No item to insert' },
      };
    }

    const endpoint = this.getEndpoint();
    const response = await this.client.request(endpoint, {
      method: 'POST',
      body: this.insertedItem,
    });

    // Réinitialiser pour permettre d'autres opérations
    this.insertedItem = undefined;

    return response;
  }

  /**
   * Exécute la mise à jour
   */
  private async executeUpdate(): Promise<{ error: any }> {
    if (this.updateData === undefined) {
      return { error: { message: 'No data to update' } };
    }

    const endpoint = this.getEndpoint();
    const idFilter = this.filters.find((f) => f.type === 'eq' && f.field === 'id');

    if (!idFilter) {
      return { error: { message: 'Update requires an id filter' } };
    }

    const response = await this.client.request(`${endpoint}/${idFilter.value}`, {
      method: 'PUT',
      body: this.updateData,
    });

    // Réinitialiser
    this.updateData = undefined;

    return { error: response.error };
  }

  /**
   * Exécute la suppression
   */
  private async executeDelete(): Promise<{ error: any }> {
    const endpoint = this.getEndpoint();
    const idFilter = this.filters.find((f) => f.type === 'eq' && f.field === 'id');

    if (!idFilter) {
      return { error: { message: 'Delete requires an id filter' } };
    }

    const response = await this.client.request(`${endpoint}/${idFilter.value}`, {
      method: 'DELETE',
    });

    return { error: response.error };
  }

  /**
   * Exécute l'upsert
   */
  private async executeUpsert(data: any, options?: { onConflict?: string }): Promise<{ error: any }> {
    // Pour l'upsert, on vérifie d'abord si l'élément existe
    // Pour simplifier, on fait un insert et on gère l'erreur de conflit
    const endpoint = this.getEndpoint();
    const response = await this.client.request(endpoint, {
      method: 'POST',
      body: data,
    });

    // Si l'insertion échoue avec un conflit, on fait un update
    if (response.error && response.error.code === 'CONFLICT') {
      // Essayer de mettre à jour
      // Note: nécessite un ID ou une autre clé unique
      return { error: { message: 'Upsert not fully supported yet' } };
    }

    return { error: response.error };
  }

  /**
   * Obtient l'endpoint API correspondant à la table
   */
  private getEndpoint(): string {
    return TABLE_TO_ENDPOINT[this.table] || `/api/${this.table}`;
  }
}

