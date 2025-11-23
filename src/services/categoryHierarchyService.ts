/**
 * Service de gestion de la hiérarchie des catégories
 */

import { client } from.*client';

export interface CategoryHierarchy {
  id: string;
  name: string;
  parent_id: string | null;
  description: string | null;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryFilter {
  id: string;
  category_id: string;
  filter_key: string;
  filter_type: 'text' | 'select' | 'multiselect' | 'range' | 'date';
  filter_label: string;
  filter_options?: string[]; // Pour select et multiselect
  is_required: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

class CategoryHierarchyService {
  private readonly CATEGORIES_TABLE = 'category_hierarchy';
  private readonly CATEGORY_FILTERS_TABLE = 'category_filters';

  /**
   * Initialise les tables si elles n'existent pas
   */
  private async initializeTables(): Promise<void> {
    const categories = this.getCategoriesTable();
    const filters = this.getFiltersTable();
    // Les tables seront créées automatiquement par LocalClient
  }

  /**
   * Récupère toutes les catégories avec leur hiérarchie
   */
  async getCategories(): Promise<CategoryHierarchy[]> {
    await this.initializeTables();
    return this.getCategoriesTable();
  }

  /**
   * Récupère les catégories racines (sans parent)
   */
  async getRootCategories(): Promise<CategoryHierarchy[]> {
    const categories = await this.getCategories();
    return categories.filter((cat) => !cat.parent_id && cat.is_active).sort((a, b) => a.order - b.order);
  }

  /**
   * Récupère les sous-catégories d'une catégorie parente
   */
  async getSubCategories(parentId: string): Promise<CategoryHierarchy[]> {
    const categories = await this.getCategories();
    return categories.filter((cat) => cat.parent_id === parentId && cat.is_active).sort((a, b) => a.order - b.order);
  }

  /**
   * Récupère une catégorie par son ID
   */
  async getCategoryById(id: string): Promise<CategoryHierarchy | null> {
    const categories = await this.getCategories();
    return categories.find((cat) => cat.id === id) || null;
  }

  /**
   * Crée une nouvelle catégorie
   */
  async createCategory(data: {
    name: string;
    parent_id?: string | null;
    description?: string | null;
    order?: number;
  }): Promise<CategoryHierarchy> {
    await this.initializeTables();
    const categories = this.getCategoriesTable();

    const maxOrder = categories
      .filter((cat) => cat.parent_id === (data.parent_id || null))
      .reduce((max, cat) => Math.max(max, cat.order), 0);

    const newCategory: CategoryHierarchy = {
      id: `cat-${Date.now()}`,
      name: data.name,
      parent_id: data.parent_id || null,
      description: data.description || null,
      order: data.order ?? maxOrder + 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    categories.push(newCategory);
    this.setCategoriesTable(categories);

    return newCategory;
  }

  /**
   * Met à jour une catégorie
   */
  async updateCategory(id: string, updates: Partial<Omit<CategoryHierarchy, 'id' | 'created_at'>>): Promise<CategoryHierarchy> {
    const categories = this.getCategoriesTable();
    const index = categories.findIndex((cat) => cat.id === id);
    
    if (index === -1) {
      throw new Error('Catégorie non trouvée');
    }

    categories[index] = {
      ...categories[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.setCategoriesTable(categories);
    return categories[index];
  }

  /**
   * Supprime une catégorie (désactive seulement pour préserver les données)
   */
  async deleteCategory(id: string): Promise<void> {
    await this.updateCategory(id, { is_active: false });
  }

  /**
   * Récupère les filtres spécifiques à une catégorie
   */
  async getCategoryFilters(categoryId: string): Promise<CategoryFilter[]> {
    await this.initializeTables();
    const filters = this.getFiltersTable();
    return filters.filter((f) => f.category_id === categoryId).sort((a, b) => a.order - b.order);
  }

  /**
   * Crée un filtre pour une catégorie
   */
  async createCategoryFilter(data: {
    category_id: string;
    filter_key: string;
    filter_type: CategoryFilter['filter_type'];
    filter_label: string;
    filter_options?: string[];
    is_required?: boolean;
    order?: number;
  }): Promise<CategoryFilter> {
    await this.initializeTables();
    const filters = this.getFiltersTable();

    const maxOrder = filters
      .filter((f) => f.category_id === data.category_id)
      .reduce((max, f) => Math.max(max, f.order), 0);

    const newFilter: CategoryFilter = {
      id: `filter-${Date.now()}`,
      category_id: data.category_id,
      filter_key: data.filter_key,
      filter_type: data.filter_type,
      filter_label: data.filter_label,
      filter_options: data.filter_options || undefined,
      is_required: data.is_required ?? false,
      order: data.order ?? maxOrder + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    filters.push(newFilter);
    this.setFiltersTable(filters);

    return newFilter;
  }

  /**
   * Met à jour un filtre
   */
  async updateCategoryFilter(id: string, updates: Partial<Omit<CategoryFilter, 'id' | 'created_at'>>): Promise<CategoryFilter> {
    const filters = this.getFiltersTable();
    const index = filters.findIndex((f) => f.id === id);
    
    if (index === -1) {
      throw new Error('Filtre non trouvé');
    }

    filters[index] = {
      ...filters[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.setFiltersTable(filters);
    return filters[index];
  }

  /**
   * Supprime un filtre
   */
  async deleteCategoryFilter(id: string): Promise<void> {
    const filters = this.getFiltersTable();
    const filtered = filters.filter((f) => f.id !== id);
    this.setFiltersTable(filtered);
  }

  private getCategoriesTable(): CategoryHierarchy[] {
    const key = `hub-lib-db-${this.CATEGORIES_TABLE}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private setCategoriesTable(categories: CategoryHierarchy[]): void {
    const key = `hub-lib-db-${this.CATEGORIES_TABLE}`;
    localStorage.setItem(key, JSON.stringify(categories));
  }

  private getFiltersTable(): CategoryFilter[] {
    const key = `hub-lib-db-${this.CATEGORY_FILTERS_TABLE}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private setFiltersTable(filters: CategoryFilter[]): void {
    const key = `hub-lib-db-${this.CATEGORY_FILTERS_TABLE}`;
    localStorage.setItem(key, JSON.stringify(filters));
  }
}

export const categoryHierarchyService = new CategoryHierarchyService();

