// ========================================
// HUBLIB - Application Constants
// ========================================

/**
 * Resource categories
 */
export const CATEGORIES = [
  "Documents & Fichiers",
  "Liens & Favoris",
  "Médias & Images",
  "Templates & Modèles",
  "Code & Scripts",
  "Formations & Tutoriels",
  "Outils & Utilitaires",
  "Données & Références",
] as const;

export type Category = (typeof CATEGORIES)[number];

/**
 * Default values
 */
export const DEFAULTS = {
  LICENSE: 'MIT',
  MAX_TAGS: 10,
  MAX_FILE_SIZE_MB: 10,
  MIN_TITLE_LENGTH: 3,
  MAX_TITLE_LENGTH: 100,
  MIN_DESCRIPTION_LENGTH: 10,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_README_LENGTH: 10000,
} as const;

/**
 * Route paths
 */
export const ROUTES = {
  HOME: '/',
  BROWSE: '/browse',
  CREATE: '/create',
  MY_RESOURCES: '/my-resources',
  CATEGORIES_TAGS: '/categories-tags',
  ADMIN: '/admin',
  PROFILE: '/profile',
  AUTH: '/auth',
  RESOURCE_DETAIL: (id: string) => `/resource/${id}`,
  USER_PROFILE: (username: string) => `/user/${username}`,
} as const;

/**
 * Query keys for React Query
 */
export const QUERY_KEYS = {
  RESOURCES: 'resources',
  RESOURCE: 'resource',
  SAVED_RESOURCES: 'saved-resources',
  SUGGESTIONS: 'suggestions',
  USER_ROLE: 'user-role',
  PROFILE: 'profile',
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  THEME: 'theme',
  LAST_SEARCH: 'last-search',
} as const;

/**
 * Animation delays (in seconds)
 */
export const ANIMATION_DELAYS = {
  STEP: 0.1,
  FAST: 0.2,
  MEDIUM: 0.4,
  SLOW: 0.6,
} as const;

/**
 * Debounce delays (in milliseconds)
 */
export const DEBOUNCE_DELAYS = {
  SEARCH: 300,
  RESIZE: 150,
  SCROLL: 100,
} as const;

/**
 * Pagination
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * External links
 */
export const EXTERNAL_LINKS = {
  GITHUB_REPO: 'https://github.com/yourusername/hublib',
  DISCORD: 'https://discord.gg/yourserver',
  DOCS: 'https://docs.hublib.dev',
} as const;

/**
 * SEO metadata
 */
export const SEO = {
  DEFAULT_TITLE: 'HubLib - Bibliothèque Communautaire de Ressources Numériques',
  DEFAULT_DESCRIPTION: 'Partagez et découvrez des ressources textuelles et données légères. Plateforme décentralisée avec GitHub, recherche par tags et catégories pour la communauté open source.',
  DEFAULT_IMAGE: 'https://lovable.dev/opengraph-image-p98pqg.png',
  TWITTER_HANDLE: '@Lovable',
} as const;
