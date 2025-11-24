/**
 * Service pour initialiser les données de base (catégories, tags, types, filtres)
 * Utilise l'API backend si disponible, sinon LocalClient en fallback
 */

import { client } from '@/integrations/client';
import { apiClient } from '@/integrations/api/client';
import { logger } from '@/lib/logger';

/**
 * Vérifie si le client actuel est ApiClient
 */
function isApiClient(client: unknown): boolean {
  return client !== null && 
         typeof client === 'object' && 
         'request' in client && 
         typeof (client as { request?: unknown }).request === 'function';
}

/**
 * Crée une suggestion via l'API backend
 */
async function createSuggestionViaAPI(suggestion: {
  name: string;
  description?: string | null;
  type: 'category' | 'tag' | 'resource_type' | 'filter';
  status?: 'pending' | 'approved';
  votesCount?: number;
}): Promise<void> {
  try {
    // Essayer d'utiliser l'endpoint admin pour créer directement des suggestions approuvées
    if (suggestion.status === 'approved') {
      const response = await apiClient.request('/api/admin/seed-suggestions', {
        method: 'POST',
        body: {
          suggestions: [{
            name: suggestion.name,
            description: suggestion.description,
            type: suggestion.type,
            votesCount: suggestion.votesCount || 0,
          }],
        },
      });

      if (response.error) {
        // Si erreur 401, arrêter complètement le seeding
        const errorCode = response.error.code || '';
        const errorMessage = response.error.message || '';
        if (
          errorCode === 'UNAUTHORIZED' || 
          errorCode === '401' || 
          errorCode === 'HTTP_401' ||
          errorMessage.includes('401') ||
          errorMessage.includes('Unauthorized')
        ) {
          throw new Error('UNAUTHORIZED'); // Propager l'erreur pour bloquer le seeding
        }
        
        // Si l'endpoint admin échoue (pas admin ou autre erreur), créer en pending
        const suggestionResponse = await apiClient.request('/api/suggestions', {
          method: 'POST',
          body: {
            name: suggestion.name,
            description: suggestion.description,
            type: suggestion.type,
          },
        });
        
        // Si cette requête échoue aussi avec 401, arrêter
        if (suggestionResponse.error) {
          const suggestionErrorCode = suggestionResponse.error.code || '';
          const suggestionErrorMessage = suggestionResponse.error.message || '';
          if (
            suggestionErrorCode === 'UNAUTHORIZED' || 
            suggestionErrorCode === '401' || 
            suggestionErrorCode === 'HTTP_401' ||
            suggestionErrorMessage.includes('401') ||
            suggestionErrorMessage.includes('Unauthorized')
          ) {
            throw new Error('UNAUTHORIZED');
          }
        }
      }
    } else {
      // Créer une suggestion normale (pending)
      const response = await apiClient.request('/api/suggestions', {
        method: 'POST',
        body: {
          name: suggestion.name,
          description: suggestion.description,
          type: suggestion.type,
        },
      });
      
      // Si erreur 401, arrêter complètement le seeding
      if (response.error) {
        const errorCode = response.error.code || '';
        const errorMessage = response.error.message || '';
        if (
          errorCode === 'UNAUTHORIZED' || 
          errorCode === '401' || 
          errorCode === 'HTTP_401' ||
          errorMessage.includes('401') ||
          errorMessage.includes('Unauthorized')
        ) {
          throw new Error('UNAUTHORIZED'); // Propager l'erreur pour bloquer le seeding
        }
      }
    }
  } catch (error: any) {
    // Si erreur UNAUTHORIZED, propager pour bloquer le seeding
    if (error?.message === 'UNAUTHORIZED' || error?.code === 'UNAUTHORIZED') {
      throw error;
    }
    // En cas d'autre erreur, on laisse le fallback LocalClient gérer
    // Ne pas throw pour permettre le fallback
  }
}

// Flag pour éviter les appels multiples simultanés
let isSeeding = false;
let hasSeeded = false;
let seedingBlocked = false; // Flag pour bloquer définitivement après erreur 401

export const seedInitialData = async () => {
  // Éviter les appels multiples simultanés
  if (isSeeding) {
    return;
  }

  // Si déjà seedé dans cette session, ne pas refaire
  if (hasSeeded) {
    return;
  }

  // Si le seeding est bloqué (erreur 401), ne plus essayer
  if (seedingBlocked) {
    return;
  }

  isSeeding = true;

  try {
    // Vérifier si déjà initialisé
    const { data: existing, error } = await client
      .from("category_tag_suggestions")
      .select("id")
      .limit(1)
      .execute();

    // Si erreur 401, bloquer définitivement le seeding pour cette session
    // Vérifier tous les codes d'erreur possibles
    if (error) {
      const errorCode = error.code || '';
      const errorMessage = error.message || '';
      
      // Bloquer pour toutes les erreurs d'authentification
      if (
        errorCode === 'UNAUTHORIZED' || 
        errorCode === '401' || 
        errorCode === 'HTTP_401' ||
        errorMessage.includes('401') ||
        errorMessage.includes('Unauthorized')
      ) {
        seedingBlocked = true;
        hasSeeded = true; // Marquer comme "seedé" pour éviter de réessayer
        isSeeding = false;
        return;
      }

      // Bloquer pour les erreurs réseau ou service indisponible
      if (
        errorCode === 'NETWORK_ERROR' || 
        errorCode === 'HTTP_503' ||
        errorCode === '503' ||
        errorMessage.includes('503') ||
        errorMessage.includes('Service Unavailable')
      ) {
        seedingBlocked = true;
        hasSeeded = true;
        isSeeding = false;
        return;
      }
    }

    if (existing && existing.length > 0) {
      hasSeeded = true;
      isSeeding = false;
      return; // Déjà initialisé
    }

  // Catégories réelles pour un système de gestion de ressources
  const categories = [
    { name: "Développement", description: "Ressources liées au développement logiciel et programmation" },
    { name: "Design", description: "Ressources pour le design UI/UX, graphisme, illustration" },
    { name: "Documentation", description: "Documentation technique, guides, tutoriels" },
    { name: "Outils", description: "Outils et applications utiles pour le développement" },
    { name: "Templates", description: "Templates et modèles réutilisables" },
    { name: "Médias", description: "Images, vidéos, audio et autres ressources multimédias" },
    { name: "Données", description: "Datasets, bases de données, APIs publiques" },
    { name: "Learning", description: "Ressources d'apprentissage, cours, formations" },
  ];

  // Tags réels et utiles
  const tags = [
    { name: "react", description: "Ressources liées à React" },
    { name: "typescript", description: "Ressources TypeScript" },
    { name: "javascript", description: "Ressources JavaScript" },
    { name: "python", description: "Ressources Python" },
    { name: "api", description: "APIs et endpoints" },
    { name: "database", description: "Bases de données" },
    { name: "frontend", description: "Développement frontend" },
    { name: "backend", description: "Développement backend" },
    { name: "mobile", description: "Développement mobile" },
    { name: "devops", description: "DevOps et infrastructure" },
    { name: "ui", description: "Interface utilisateur" },
    { name: "ux", description: "Expérience utilisateur" },
    { name: "open-source", description: "Projets open source" },
    { name: "tutorial", description: "Tutoriels et guides" },
    { name: "library", description: "Bibliothèques et frameworks" },
  ];

  // Types de ressources réels
  const resourceTypes = [
    { name: "github_repo", description: "Dépôt GitHub" },
    { name: "external_link", description: "Lien externe" },
    { name: "file_upload", description: "Fichier uploadé" },
  ];

  // Filtres réels et utiles
  const filters = [
    { name: "Popularité", description: "Filtrer par popularité (vues, téléchargements)" },
    { name: "Date", description: "Filtrer par date de création" },
    { name: "Note", description: "Filtrer par note moyenne" },
    { name: "Langue", description: "Filtrer par langage de programmation" },
    { name: "Licence", description: "Filtrer par type de licence" },
    { name: "Visibilité", description: "Filtrer par visibilité (public/privé)" },
  ];

  // Si on utilise ApiClient, utiliser l'API backend
  if (isApiClient(client)) {
    try {
      // Créer les suggestions pour les catégories
      for (const category of categories) {
        await createSuggestionViaAPI({
          name: category.name,
          description: category.description,
          type: "category",
          status: "approved",
          votesCount: 10,
        });
      }

      // Créer les suggestions pour les tags
      for (const tag of tags) {
        await createSuggestionViaAPI({
          name: tag.name,
          description: tag.description,
          type: "tag",
          status: "approved",
          votesCount: 8,
        });
      }

      // Créer les suggestions pour les types de ressources
      for (const type of resourceTypes) {
        await createSuggestionViaAPI({
          name: type.name,
          description: type.description,
          type: "resource_type",
          status: "approved",
          votesCount: 5,
        });
      }

      // Créer les suggestions pour les filtres
      for (const filter of filters) {
        await createSuggestionViaAPI({
          name: filter.name,
          description: filter.description,
          type: "filter",
          status: "approved",
          votesCount: 7,
        });
      }

      // Créer quelques suggestions en attente pour tester
      const pendingSuggestions = [
        { name: "Sécurité", type: "category" as const, description: "Ressources liées à la sécurité informatique" },
        { name: "Machine Learning", type: "tag" as const, description: "Ressources sur le machine learning et l'IA" },
        { name: "Docker", type: "tag" as const, description: "Ressources Docker et conteneurisation" },
        { name: "API REST", type: "filter" as const, description: "Filtrer les ressources par type d'API (REST, GraphQL, etc.)" },
      ];

      for (const suggestion of pendingSuggestions) {
        await createSuggestionViaAPI({
          name: suggestion.name,
          description: suggestion.description,
          type: suggestion.type,
          status: "pending",
        });
      }

      return; // Succès avec l'API
    } catch (error) {
      // En cas d'erreur, on laisse le fallback LocalClient gérer
      // Ne pas logger ici car le logger pourrait ne pas être initialisé
      // Continuer avec LocalClient en fallback
    }
  }

  // Fallback vers LocalClient (comportement original)
  // Créer les suggestions pour les catégories
  for (const category of categories) {
    await client
      .from("category_tag_suggestions")
      .insert({
        name: category.name,
        description: category.description,
        type: "category",
        status: "approved",
        votes_count: 10,
        suggested_by: null,
        action: "add",
      })
      .execute();
  }

  // Créer les suggestions pour les tags
  for (const tag of tags) {
    await client
      .from("category_tag_suggestions")
      .insert({
        name: tag.name,
        description: tag.description,
        type: "tag",
        status: "approved",
        votes_count: 8,
        suggested_by: null,
        action: "add",
      })
      .execute();
  }

  // Créer les suggestions pour les types de ressources
  for (const type of resourceTypes) {
    await client
      .from("category_tag_suggestions")
      .insert({
        name: type.name,
        description: type.description,
        type: "resource_type",
        status: "approved",
        votes_count: 5,
        suggested_by: null,
        action: "add",
      })
      .execute();
  }

  // Créer les suggestions pour les filtres
  for (const filter of filters) {
    await client
      .from("category_tag_suggestions")
      .insert({
        name: filter.name,
        description: filter.description,
        type: "filter",
        status: "approved",
        votes_count: 7,
        suggested_by: null,
        action: "add",
      })
      .execute();
  }

  // Créer quelques suggestions en attente pour tester
  const pendingSuggestions = [
    { name: "Sécurité", type: "category" as const, description: "Ressources liées à la sécurité informatique" },
    { name: "Machine Learning", type: "tag" as const, description: "Ressources sur le machine learning et l'IA" },
    { name: "Docker", type: "tag" as const, description: "Ressources Docker et conteneurisation" },
    { name: "API REST", type: "filter" as const, description: "Filtrer les ressources par type d'API (REST, GraphQL, etc.)" },
  ];

  for (const suggestion of pendingSuggestions) {
    await client
      .from("category_tag_suggestions")
      .insert({
        name: suggestion.name,
        description: suggestion.description,
        type: suggestion.type,
        status: "pending",
        votes_count: 0,
        suggested_by: null,
        action: "add",
      })
      .execute();
  }

  // Marquer comme seedé
  hasSeeded = true;
  } catch (error: any) {
    // En cas d'erreur, bloquer le seeding pour éviter les boucles infinies
    logger.error('Erreur lors du seeding initial', undefined, error instanceof Error ? error : new Error(String(error)));
    
    // Si erreur 401 ou réseau, bloquer définitivement
    const errorCode = error?.code || '';
    const errorMessage = error?.message || '';
    if (
      errorCode === 'UNAUTHORIZED' || 
      errorCode === '401' || 
      errorCode === 'HTTP_401' ||
      errorMessage === 'UNAUTHORIZED' ||
      errorMessage.includes('401') ||
      errorMessage.includes('Unauthorized') ||
      errorCode === 'NETWORK_ERROR' || 
      errorCode === 'HTTP_503' ||
      errorCode === '503' ||
      errorMessage.includes('503') ||
      errorMessage.includes('Service Unavailable')
    ) {
      seedingBlocked = true;
      hasSeeded = true;
    }
  } finally {
    isSeeding = false;
  }
};
