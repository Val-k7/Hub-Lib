/**
 * Service de gestion des templates de ressources
 */

import { client } from.*client';
import type { Resource } from '@/types/resource';

export interface ResourceTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  language?: string;
  readme?: string;
  icon?: string;
  preview?: string;
  isPublic: boolean;
  createdBy?: string;
  usageCount: number;
  createdAt: string;
  templateData: Partial<Resource>;
}

class TemplateService {
  private readonly TEMPLATE_TABLE = 'resource_templates';

  /**
   * Initialise la table des templates avec des templates par défaut
   */
  async initializeDefaultTemplates(): Promise<void> {
    const existing = this.getTable();
    if (existing.length > 0) {
      return; // Déjà initialisé
    }

    const defaultTemplates: Omit<ResourceTemplate, 'id' | 'createdAt'>[] = [
      {
        name: 'Template React Component',
        description: 'Template pour créer un composant React avec TypeScript',
        category: 'Code & Scripts',
        tags: ['react', 'typescript', 'component', 'template'],
        language: 'TypeScript',
        readme: `# Template React Component

Ce template vous permet de créer rapidement un nouveau composant React avec TypeScript.

## Utilisation

1. Utilisez ce template pour créer votre composant
2. Personnalisez selon vos besoins
3. Partagez avec la communauté`,
        isPublic: true,
        usageCount: 0,
        templateData: {
          title: 'Mon Composant React',
          description: 'Un composant React avec TypeScript',
          category: 'Code & Scripts',
          tags: ['react', 'typescript'],
          language: 'TypeScript',
          resource_type: 'external_link',
          visibility: 'public',
        },
      },
      {
        name: 'Template API REST',
        description: 'Template pour créer une API REST avec Node.js et Express',
        category: 'Code & Scripts',
        tags: ['nodejs', 'express', 'api', 'rest'],
        language: 'JavaScript',
        readme: `# Template API REST

Template pour créer rapidement une API REST avec Node.js et Express.

## Fonctionnalités

- Routes RESTful
- Middleware d'authentification
- Gestion d'erreurs
- Validation des données`,
        isPublic: true,
        usageCount: 0,
        templateData: {
          title: 'Mon API REST',
          description: 'Une API REST avec Node.js et Express',
          category: 'Code & Scripts',
          tags: ['nodejs', 'express', 'api'],
          language: 'JavaScript',
          resource_type: 'external_link',
          visibility: 'public',
        },
      },
      {
        name: 'Template Documentation',
        description: 'Template pour créer de la documentation technique',
        category: 'Documents & Fichiers',
        tags: ['documentation', 'markdown', 'guide'],
        language: 'Markdown',
        readme: `# Template Documentation

Template pour créer de la documentation technique complète.

## Structure

- Introduction
- Installation
- Utilisation
- API Reference
- Exemples`,
        isPublic: true,
        usageCount: 0,
        templateData: {
          title: 'Ma Documentation',
          description: 'Documentation technique complète',
          category: 'Documents & Fichiers',
          tags: ['documentation', 'markdown'],
          language: 'Markdown',
          resource_type: 'external_link',
          visibility: 'public',
        },
      },
      {
        name: 'Template Configuration',
        description: 'Template pour fichiers de configuration',
        category: 'Outils & Utilitaires',
        tags: ['config', 'setup', 'configuration'],
        language: 'JSON',
        readme: `# Template Configuration

Template pour créer des fichiers de configuration.

## Types supportés

- JSON
- YAML
- TOML
- Environment variables`,
        isPublic: true,
        usageCount: 0,
        templateData: {
          title: 'Ma Configuration',
          description: 'Fichier de configuration',
          category: 'Outils & Utilitaires',
          tags: ['config', 'setup'],
          language: 'JSON',
          resource_type: 'external_link',
          visibility: 'public',
        },
      },
    ];

    const templates: ResourceTemplate[] = defaultTemplates.map((template, index) => ({
      ...template,
      id: `template-${index + 1}`,
      createdAt: new Date().toISOString(),
    }));

    this.setTable(templates);
  }

  /**
   * Récupère tous les templates publics
   */
  async getPublicTemplates(): Promise<ResourceTemplate[]> {
    await this.initializeDefaultTemplates();
    const templates = this.getTable();
    return templates.filter(t => t.isPublic);
  }

  /**
   * Récupère un template par ID
   */
  async getTemplateById(id: string): Promise<ResourceTemplate | null> {
    await this.initializeDefaultTemplates();
    const templates = this.getTable();
    return templates.find(t => t.id === id) || null;
  }

  /**
   * Crée une ressource à partir d'un template
   */
  async createResourceFromTemplate(
    templateId: string,
    userId: string,
    customizations?: Partial<Resource>
  ): Promise<Resource> {
    const template = await this.getTemplateById(templateId);
    if (!template) {
      throw new Error('Template non trouvé');
    }

    // Incrémenter le compteur d'utilisation
    await this.incrementUsageCount(templateId);

    // Créer la ressource avec les données du template
    const resourceData: Partial<Resource> = {
      ...template.templateData,
      ...customizations,
      user_id: userId,
      title: customizations?.title || template.templateData.title || template.name,
      description: customizations?.description || template.templateData.description || template.description,
      readme: customizations?.readme || template.readme || template.templateData.readme,
    };

    const { data, error } = await client
      .from('resources')
      .insert(resourceData)
      .select('*, profiles(*)')
      .single()
      .execute();

    if (error) {
      throw new Error(`Erreur lors de la création: ${error.message}`);
    }

    return data;
  }

  /**
   * Crée un nouveau template
   */
  async createTemplate(
    template: Omit<ResourceTemplate, 'id' | 'createdAt' | 'usageCount'>
  ): Promise<ResourceTemplate> {
    await this.initializeDefaultTemplates();
    const templates = this.getTable();
    
    const newTemplate: ResourceTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      createdAt: new Date().toISOString(),
      usageCount: 0,
    };

    this.setTable([...templates, newTemplate]);
    return newTemplate;
  }

  /**
   * Incrémente le compteur d'utilisation d'un template
   */
  private async incrementUsageCount(templateId: string): Promise<void> {
    const templates = this.getTable();
    const template = templates.find(t => t.id === templateId);
    if (template) {
      template.usageCount += 1;
      this.setTable(templates);
    }
  }

  /**
   * Récupère les templates les plus utilisés
   */
  async getPopularTemplates(limit: number = 10): Promise<ResourceTemplate[]> {
    await this.initializeDefaultTemplates();
    const templates = this.getTable();
    return templates
      .filter(t => t.isPublic)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
  }

  /**
   * Recherche des templates
   */
  async searchTemplates(query: string): Promise<ResourceTemplate[]> {
    await this.initializeDefaultTemplates();
    const templates = this.getTable();
    const queryLower = query.toLowerCase();
    
    return templates.filter(t => 
      t.isPublic &&
      (t.name.toLowerCase().includes(queryLower) ||
       t.description.toLowerCase().includes(queryLower) ||
       t.tags.some(tag => tag.toLowerCase().includes(queryLower)))
    );
  }

  private getTable(): ResourceTemplate[] {
    const key = `hub-lib-db-${this.TEMPLATE_TABLE}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  private setTable(templates: ResourceTemplate[]): void {
    const key = `hub-lib-db-${this.TEMPLATE_TABLE}`;
    localStorage.setItem(key, JSON.stringify(templates));
  }
}

export const templateService = new TemplateService();


