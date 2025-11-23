/**
 * Service pour initialiser les données de base (catégories, tags, types, filtres)
 * Aucun mock - données réelles et utiles
 */

import { client } from.*client';

export const seedInitialData = async () => {
  // Vérifier si déjà initialisé
  const { data: existing } = await client
    .from("category_tag_suggestions")
    .select("id")
    .limit(1)
    .execute();

  if (existing && existing.length > 0) {
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

  // Créer les suggestions pour les catégories
  for (const category of categories) {
    await client
      .from("category_tag_suggestions")
      .insert({
        name: category.name,
        description: category.description,
        type: "category",
        status: "approved",
        votes_count: 10, // Score initial positif
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
        votes_count: 8, // Score initial positif
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
};

