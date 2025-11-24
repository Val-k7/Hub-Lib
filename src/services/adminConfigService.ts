/**
 * Service de gestion de la configuration admin
 */

import { client } from '@/integrations/client';
import { logger } from '@/lib/logger';

export interface AdminConfig {
  id: string;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

class AdminConfigService {
  private readonly CONFIG_TABLE = 'admin_config';
  private readonly DEFAULT_CONFIG = {
    auto_approval_vote_threshold_category: '5',
    auto_approval_vote_threshold_tag: '5',
    auto_approval_vote_threshold_resource_type: '5',
    auto_approval_vote_threshold_filter: '5',
    auto_rejection_downvote_threshold_category: '3',
    auto_rejection_downvote_threshold_tag: '3',
    auto_rejection_downvote_threshold_resource_type: '3',
    auto_rejection_downvote_threshold_filter: '3',
    auto_approval_enabled: 'true',
    consider_downvotes: 'true',
  };

  /**
   * Initialise la configuration admin avec des valeurs par défaut
   */
  async initializeConfig(): Promise<void> {
    const configs = await this.getTable();
    if (configs.length > 0) {
      return; // Déjà initialisé
    }

    const defaultConfigs: Omit<AdminConfig, 'id' | 'created_at' | 'updated_at'>[] = [
      {
        key: 'auto_approval_vote_threshold_category',
        value: this.DEFAULT_CONFIG.auto_approval_vote_threshold_category,
        description: 'Score net requis pour l\'approbation automatique d\'une catégorie',
      },
      {
        key: 'auto_approval_vote_threshold_tag',
        value: this.DEFAULT_CONFIG.auto_approval_vote_threshold_tag,
        description: 'Score net requis pour l\'approbation automatique d\'un tag',
      },
      {
        key: 'auto_approval_vote_threshold_resource_type',
        value: this.DEFAULT_CONFIG.auto_approval_vote_threshold_resource_type,
        description: 'Score net requis pour l\'approbation automatique d\'un type de ressource',
      },
      {
        key: 'auto_approval_vote_threshold_filter',
        value: this.DEFAULT_CONFIG.auto_approval_vote_threshold_filter,
        description: 'Score net requis pour l\'approbation automatique d\'un filtre',
      },
      {
        key: 'auto_rejection_downvote_threshold_category',
        value: this.DEFAULT_CONFIG.auto_rejection_downvote_threshold_category,
        description: 'Nombre de downvotes requis pour le rejet automatique d\'une catégorie',
      },
      {
        key: 'auto_rejection_downvote_threshold_tag',
        value: this.DEFAULT_CONFIG.auto_rejection_downvote_threshold_tag,
        description: 'Nombre de downvotes requis pour le rejet automatique d\'un tag',
      },
      {
        key: 'auto_rejection_downvote_threshold_resource_type',
        value: this.DEFAULT_CONFIG.auto_rejection_downvote_threshold_resource_type,
        description: 'Nombre de downvotes requis pour le rejet automatique d\'un type de ressource',
      },
      {
        key: 'auto_rejection_downvote_threshold_filter',
        value: this.DEFAULT_CONFIG.auto_rejection_downvote_threshold_filter,
        description: 'Nombre de downvotes requis pour le rejet automatique d\'un filtre',
      },
      {
        key: 'auto_approval_enabled',
        value: this.DEFAULT_CONFIG.auto_approval_enabled,
        description: 'Activer l\'approbation automatique basée sur les votes',
      },
      {
        key: 'consider_downvotes',
        value: this.DEFAULT_CONFIG.consider_downvotes,
        description: 'Prendre en compte les downvotes dans le calcul du score',
      },
    ];

    const now = new Date().toISOString();
    const configsWithIds: AdminConfig[] = defaultConfigs.map((config, index) => ({
      ...config,
      id: `config-${index + 1}`,
      created_at: now,
      updated_at: now,
    }));

    await this.setTable(configsWithIds);
  }

  /**
   * Récupère une valeur de configuration
   */
  async getConfig(key: string): Promise<string | null> {
    await this.initializeConfig();
    const configs = await this.getTable();
    const config = configs.find((c) => c.key === key);
    return config?.value || null;
  }

  /**
   * Définit une valeur de configuration
   */
  async setConfig(key: string, value: string, description?: string): Promise<void> {
    await this.initializeConfig();
    const configs = await this.getTable();
    const existingIndex = configs.findIndex((c) => c.key === key);

    const configData: Partial<AdminConfig> = {
      key,
      value,
      description: description || null,
      updated_at: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      configs[existingIndex] = {
        ...configs[existingIndex],
        ...configData,
      };
    } else {
      configs.push({
        ...configData,
        id: `config-${Date.now()}`,
        created_at: new Date().toISOString(),
      } as AdminConfig);
    }

    await this.setTable(configs);
  }

  /**
   * Récupère toutes les configurations
   */
  async getAllConfigs(): Promise<AdminConfig[]> {
    await this.initializeConfig();
    return await this.getTable();
  }

  /**
   * Récupère le seuil de votes pour l'approbation automatique d'une catégorie
   */
  async getCategoryVoteThreshold(): Promise<number> {
    const value = await this.getConfig('auto_approval_vote_threshold_category');
    return value ? parseInt(value, 10) : parseInt(this.DEFAULT_CONFIG.auto_approval_vote_threshold_category, 10);
  }

  /**
   * Récupère le seuil de votes pour l'approbation automatique d'un tag
   */
  async getTagVoteThreshold(): Promise<number> {
    const value = await this.getConfig('auto_approval_vote_threshold_tag');
    return value ? parseInt(value, 10) : parseInt(this.DEFAULT_CONFIG.auto_approval_vote_threshold_tag, 10);
  }

  /**
   * Récupère le seuil de votes pour l'approbation automatique d'un type de ressource
   */
  async getResourceTypeVoteThreshold(): Promise<number> {
    const value = await this.getConfig('auto_approval_vote_threshold_resource_type');
    return value ? parseInt(value, 10) : parseInt(this.DEFAULT_CONFIG.auto_approval_vote_threshold_resource_type, 10);
  }

  /**
   * Récupère le seuil de votes pour l'approbation automatique d'un filtre
   */
  async getFilterVoteThreshold(): Promise<number> {
    const value = await this.getConfig('auto_approval_vote_threshold_filter');
    return value ? parseInt(value, 10) : parseInt(this.DEFAULT_CONFIG.auto_approval_vote_threshold_filter, 10);
  }

  /**
   * Récupère le seuil de votes pour un type de suggestion donné
   */
  async getVoteThreshold(type: "category" | "tag" | "resource_type" | "filter"): Promise<number> {
    switch (type) {
      case "category":
        return await this.getCategoryVoteThreshold();
      case "tag":
        return await this.getTagVoteThreshold();
      case "resource_type":
        return await this.getResourceTypeVoteThreshold();
      case "filter":
        return await this.getFilterVoteThreshold();
    }
  }

  /**
   * Récupère le seuil de downvotes pour le rejet automatique
   */
  async getDownvoteThreshold(type: "category" | "tag" | "resource_type" | "filter"): Promise<number> {
    switch (type) {
      case "category":
        return await this.getConfig('auto_rejection_downvote_threshold_category').then(v => v ? parseInt(v, 10) : parseInt(this.DEFAULT_CONFIG.auto_rejection_downvote_threshold_category, 10));
      case "tag":
        return await this.getConfig('auto_rejection_downvote_threshold_tag').then(v => v ? parseInt(v, 10) : parseInt(this.DEFAULT_CONFIG.auto_rejection_downvote_threshold_tag, 10));
      case "resource_type":
        return await this.getConfig('auto_rejection_downvote_threshold_resource_type').then(v => v ? parseInt(v, 10) : parseInt(this.DEFAULT_CONFIG.auto_rejection_downvote_threshold_resource_type, 10));
      case "filter":
        return await this.getConfig('auto_rejection_downvote_threshold_filter').then(v => v ? parseInt(v, 10) : parseInt(this.DEFAULT_CONFIG.auto_rejection_downvote_threshold_filter, 10));
    }
  }

  /**
   * Vérifie si l'approbation automatique est activée
   */
  async isAutoApprovalEnabled(): Promise<boolean> {
    const value = await this.getConfig('auto_approval_enabled');
    return value === 'true' || value === null; // Par défaut activé
  }

  /**
   * Vérifie si les downvotes sont pris en compte
   */
  async shouldConsiderDownvotes(): Promise<boolean> {
    const value = await this.getConfig('consider_downvotes');
    return value === 'true' || value === null; // Par défaut activé
  }

  private async getTable(): Promise<AdminConfig[]> {
    const { data, error } = await client
      .from(this.CONFIG_TABLE)
      .select('*')
      .execute();
    
    if (error) {
      logger.error('Erreur lors de la récupération de la config', error instanceof Error ? error : new Error(String(error)));
      return [];
    }
    
    return data || [];
  }

  private async setTable(configs: AdminConfig[]): Promise<void> {
    // Pour chaque config, faire un upsert
    for (const config of configs) {
      const { error } = await client
        .from(this.CONFIG_TABLE)
        .upsert(config, { onConflict: 'key' })
        .execute();
      
      if (error) {
        logger.error('Erreur lors de la sauvegarde de la config', error instanceof Error ? error : new Error(String(error)));
      }
    }
  }
}

export const adminConfigService = new AdminConfigService();

