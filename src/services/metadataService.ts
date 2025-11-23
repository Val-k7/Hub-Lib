/**
 * Service unifié pour gérer les métadonnées (catégories, tags, types de ressources, filtres)
 */

import { client } from '@/integrations/client';

export type MetadataType = "category" | "tag" | "resource_type" | "filter";

export interface Metadata {
  name: string;
  type: MetadataType;
  usage_count: number;
  public_count: number;
  is_approved: boolean;
  created_at?: string;
  updated_at?: string;
}

class MetadataService {
  /**
   * Récupère toutes les catégories
   */
  async getCategories(): Promise<string[]> {
    const { data, error } = await client
      .from("resources")
      .select("category")
      .not("category", "is", null)
      .execute();

    if (error) throw error;

    const uniqueCategories = Array.from(
      new Set(data.map((item) => item.category).filter(Boolean))
    ) as string[];

    return uniqueCategories.sort();
  }

  /**
   * Récupère toutes les catégories avec leur usage
   */
  async getCategoriesWithUsage(): Promise<Metadata[]> {
    const { data, error } = await client
      .from("resources")
      .select("category, visibility")
      .not("category", "is", null)
      .execute();

    if (error) throw error;

    const categoryCounts = data.reduce(
      (acc: Record<string, { total: number; public: number }>, item) => {
        if (!acc[item.category]) {
          acc[item.category] = { total: 0, public: 0 };
        }
        acc[item.category].total += 1;
        if (item.visibility === 'public') {
          acc[item.category].public += 1;
        }
        return acc;
      },
      {}
    );

    return Object.entries(categoryCounts)
      .map(([name, counts]) => ({
        name,
        type: "category" as MetadataType,
        usage_count: counts.total,
        public_count: counts.public,
        is_approved: true, // Considérées comme approuvées si utilisées
      }))
      .sort((a, b) => b.usage_count - a.usage_count);
  }

  /**
   * Récupère tous les tags
   */
  async getTags(): Promise<string[]> {
    const { data, error } = await client
      .from("resources")
      .select("tags")
      .not("tags", "is", null)
      .execute();

    if (error) throw error;

    const allTags = new Set<string>();
    data.forEach((item) => {
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach((tag: string) => {
          if (tag) allTags.add(tag.toLowerCase());
        });
      }
    });

    return Array.from(allTags).sort();
  }

  /**
   * Récupère tous les tags avec leur usage
   */
  async getTagsWithUsage(): Promise<Metadata[]> {
    const { data, error } = await client
      .from("resources")
      .select("tags, visibility")
      .not("tags", "is", null)
      .execute();

    if (error) throw error;

    const tagCounts = data.reduce(
      (acc: Record<string, { total: number; public: number }>, item) => {
        if (item.tags && Array.isArray(item.tags)) {
          item.tags.forEach((tag: string) => {
            if (!tag) return;
            const tagLower = tag.toLowerCase();
            if (!acc[tagLower]) {
              acc[tagLower] = { total: 0, public: 0 };
            }
            acc[tagLower].total += 1;
            if (item.visibility === 'public') {
              acc[tagLower].public += 1;
            }
          });
        }
        return acc;
      },
      {}
    );

    return Object.entries(tagCounts)
      .map(([name, counts]) => ({
        name,
        type: "tag" as MetadataType,
        usage_count: counts.total,
        public_count: counts.public,
        is_approved: true,
      }))
      .sort((a, b) => b.usage_count - a.usage_count);
  }

  /**
   * Récupère tous les types de ressources utilisés
   */
  async getResourceTypes(): Promise<string[]> {
    const { data, error } = await client
      .from("resources")
      .select("resource_type")
      .execute();

    if (error) throw error;

    const uniqueTypes = Array.from(
      new Set(data.map((item) => item.resource_type).filter(Boolean))
    ) as string[];

    return uniqueTypes.sort();
  }

  /**
   * Récupère tous les types de ressources avec leur usage
   */
  async getResourceTypesWithUsage(): Promise<Metadata[]> {
    const { data, error } = await client
      .from("resources")
      .select("resource_type, visibility")
      .execute();

    if (error) throw error;

    const typeCounts = data.reduce(
      (acc: Record<string, { total: number; public: number }>, item) => {
        const type = item.resource_type || 'unknown';
        if (!acc[type]) {
          acc[type] = { total: 0, public: 0 };
        }
        acc[type].total += 1;
        if (item.visibility === 'public') {
          acc[type].public += 1;
        }
        return acc;
      },
      {}
    );

    return Object.entries(typeCounts)
      .map(([name, counts]) => ({
        name,
        type: "resource_type" as MetadataType,
        usage_count: counts.total,
        public_count: counts.public,
        is_approved: true,
      }))
      .sort((a, b) => b.usage_count - a.usage_count);
  }

  /**
   * Récupère tous les éléments d'un type donné
   */
  async getMetadata(type: MetadataType): Promise<string[]> {
    switch (type) {
      case "category":
        return await this.getCategories();
      case "tag":
        return await this.getTags();
      case "resource_type":
        return await this.getResourceTypes();
      case "filter":
        return []; // Les filtres sont gérés différemment
    }
  }

  /**
   * Récupère tous les éléments d'un type donné avec leur usage
   */
  async getMetadataWithUsage(type: MetadataType): Promise<Metadata[]> {
    switch (type) {
      case "category":
        return await this.getCategoriesWithUsage();
      case "tag":
        return await this.getTagsWithUsage();
      case "resource_type":
        return await this.getResourceTypesWithUsage();
      case "filter":
        return []; // Les filtres sont gérés différemment
    }
  }
}

export const metadataService = new MetadataService();

