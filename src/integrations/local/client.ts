/**
 * Client local pour remplacer Supabase
 * Utilise localStorage pour stocker toutes les données
 * 
 * @module LocalClient
 * @description
 * Cette classe simule l'API Supabase en utilisant localStorage comme backend.
 * Elle fournit les mêmes méthodes que Supabase pour faciliter la migration future.
 * 
 * @example
 * ```typescript
 * import { localClient } from '@/integrations/local/client';
 * 
 * // Authentification
 * const { data: { session } } = await localClient.auth.getSession();
 * 
 * // Requêtes de base de données
 * const { data, error } = await localClient
 *   .from('resources')
 *   .select('*')
 *   .eq('visibility', 'public')
 *   .execute();
 * ```
 */

// Types pour l'authentification

/**
 * Représente un utilisateur local
 */
export interface LocalUser {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
  created_at: string;
}

/**
 * Représente une session d'authentification locale
 */
export interface LocalSession {
  access_token: string;
  user: LocalUser;
  expires_at?: number;
}

/**
 * Classe principale pour simuler l'API Supabase
 * 
 * @class LocalClient
 */
class LocalClient {
  private storage: Storage;
  private authKey = "hub-lib-auth";
  private dbPrefix = "hub-lib-db-";

  constructor() {
    this.storage = localStorage;
    this.initializeDatabase();
    this.migrateLegacyData();
    // Initialiser les données de base au chargement
    this.initSeedData();
  }

  /**
   * Initialise les données de base (catégories, tags, etc.)
   */
  private async initSeedData(): Promise<void> {
    // Vérifier si déjà initialisé
    const { data: existing } = await this
      .from("category_tag_suggestions")
      .select("id")
      .limit(1)
      .execute();

    if (existing && existing.length > 0) {
      return; // Déjà initialisé
    }

    // Importer seedInitialData de manière dynamique pour éviter les dépendances circulaires
    import("@/services/seedData").then(({ seedInitialData }) => {
      seedInitialData().catch(console.error);
    });
  }

  /**
   * Migre les données legacy pour la compatibilité
   */
  private migrateLegacyData(): void {
    // Initialiser les tables manquantes
    const newTables = [
      'resource_templates',
      'collections',
      'collection_resources',
      'resource_versions',
    ];

    newTables.forEach((table) => {
      const key = this.dbPrefix + table;
      if (!this.storage.getItem(key)) {
        this.storage.setItem(key, JSON.stringify([]));
      }
    });
  }

  // Initialiser la base de données avec des données par défaut
  private initializeDatabase() {
    const tables = [
      "profiles",
      "resources",
      "saved_resources",
      "resource_ratings",
      "resource_shares",
      "resource_comments",
      "groups",
      "group_members",
      "notifications",
      "category_tag_suggestions",
      "suggestion_votes",
      "user_roles",
      "resource_templates",
      "collections",
      "collection_resources",
      "admin_config",
      "category_hierarchy",
      "category_filters",
    ];

    tables.forEach((table) => {
      const key = this.dbPrefix + table;
      if (!this.storage.getItem(key)) {
        this.storage.setItem(key, JSON.stringify([]));
      }
    });

    // Créer un utilisateur admin par défaut si aucun utilisateur n'existe
    const users = this.getTable("profiles");
    if (users.length === 0) {
      const adminId = this.generateId();
      const adminUser: LocalUser = {
        id: adminId,
        email: "admin@example.com",
        user_metadata: {
          full_name: "Administrateur",
        },
        created_at: new Date().toISOString(),
      };

      this.setTable("profiles", [
        {
          id: adminId,
          username: "admin",
          full_name: "Administrateur",
          avatar_url: null,
          bio: null,
          github_username: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      this.setTable("user_roles", [
        {
          id: this.generateId(),
          user_id: adminId,
          role: "admin",
          created_at: new Date().toISOString(),
        },
      ]);

      // Créer une session pour l'admin
      const session: LocalSession = {
        access_token: "admin-token",
        user: adminUser,
      };
      this.storage.setItem(this.authKey, JSON.stringify(session));
    }
  }

  /**
   * API d'authentification
   * 
   * @namespace auth
   */
  auth = {
    /**
     * Récupère la session actuelle de l'utilisateur
     * 
     * @returns {Promise<{data: {session: LocalSession | null}}>} La session actuelle ou null
     * 
     * @example
     * ```typescript
     * const { data: { session } } = await localClient.auth.getSession();
     * if (session) {
     *   console.log('Utilisateur connecté:', session.user.email);
     * }
     * ```
     */
    getSession: async (): Promise<{
      data: { session: LocalSession | null };
    }> => {
      const sessionStr = this.storage.getItem(this.authKey);
      if (!sessionStr) {
        return { data: { session: null } };
      }

      const session: LocalSession = JSON.parse(sessionStr);

      // Vérifier l'expiration
      if (session.expires_at && session.expires_at < Date.now()) {
        this.storage.removeItem(this.authKey);
        return { data: { session: null } };
      }

      return { data: { session } };
    },

    /**
     * Récupère l'utilisateur actuellement connecté
     * 
     * @returns {Promise<{data: {user: LocalUser | null}}>} L'utilisateur actuel ou null
     * 
     * @example
     * ```typescript
     * const { data: { user } } = await localClient.auth.getUser();
     * if (user) {
     *   console.log('ID utilisateur:', user.id);
     * }
     * ```
     */
    getUser: async (): Promise<{ data: { user: LocalUser | null } }> => {
      const {
        data: { session },
      } = await this.auth.getSession();
      return { data: { user: session?.user || null } };
    },

    /**
     * Connecte un utilisateur avec email et mot de passe
     * 
     * @param {Object} credentials - Les identifiants de connexion
     * @param {string} credentials.email - L'email de l'utilisateur
     * @param {string} credentials.password - Le mot de passe (ignoré en mode local)
     * @returns {Promise<{error: any}>} Objet avec une propriété error (null si succès)
     * 
     * @example
     * ```typescript
     * const { error } = await localClient.auth.signInWithPassword({
     *   email: 'user@example.com',
     *   password: 'password123'
     * });
     * if (error) {
     *   console.error('Erreur de connexion:', error);
     * }
     * ```
     */
    signInWithPassword: async (credentials: {
      email: string;
      password: string;
    }): Promise<{ error: any }> => {
      // Import dynamique pour éviter les problèmes de dépendances circulaires
      const { verifyPassword, hashPassword, generateSalt } = await import('@/lib/auth');
      const { authStorage } = await import('./authStorage');
      
      const profiles = this.getTable("profiles");
      const authData = authStorage.getByEmail(credentials.email);
      
      // Récupérer le profil utilisateur
      let user = profiles.find((p: any) => p.email === credentials.email);
      
      // Si l'utilisateur n'existe pas du tout
      if (!user) {
        return { error: { message: "Email ou mot de passe incorrect" } };
      }

      // Si l'utilisateur existe mais n'a pas de données d'authentification (utilisateur legacy)
      if (!authData) {
        // Mode rétrocompatibilité : créer automatiquement les données d'auth avec le mot de passe fourni
        // Pour les utilisateurs existants, on accepte n'importe quel mot de passe la première fois
        const salt = generateSalt();
        const passwordHash = hashPassword(credentials.password, salt);
        
        authStorage.save({
          userId: user.id,
          email: credentials.email,
          passwordHash,
          salt,
          createdAt: user.created_at || new Date().toISOString(),
        });
        
        // Mettre à jour la dernière connexion
        authStorage.updateLastLogin(credentials.email);
      } else {
        // Vérifier le mot de passe pour les utilisateurs avec données d'auth
        const isValid = verifyPassword(credentials.password, authData.passwordHash, authData.salt);
        if (!isValid) {
          return { error: { message: "Email ou mot de passe incorrect" } };
        }

        // Mettre à jour la dernière connexion
        authStorage.updateLastLogin(credentials.email);
      }

      const localUser: LocalUser = {
        id: user.id,
        email: credentials.email,
        user_metadata: {
          full_name: user.full_name,
          avatar_url: user.avatar_url,
        },
        created_at: user.created_at,
      };

      const session: LocalSession = {
        access_token: this.generateId(),
        user: localUser,
        expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 jours
      };

      this.storage.setItem(this.authKey, JSON.stringify(session));

      // Déclencher l'événement auth state change
      window.dispatchEvent(
        new CustomEvent("auth-state-changed", { detail: { session } })
      );

      return { error: null };
    },

    /**
     * Inscrit un nouvel utilisateur
     * 
     * @param {Object} credentials - Les identifiants d'inscription
     * @param {string} credentials.email - L'email de l'utilisateur
     * @param {string} credentials.password - Le mot de passe (ignoré en mode local)
     * @param {Object} [credentials.options] - Options supplémentaires
     * @param {string} [credentials.options.emailRedirectTo] - URL de redirection après inscription
     * @returns {Promise<{error: any}>} Objet avec une propriété error (null si succès)
     * 
     * @example
     * ```typescript
     * const { error } = await localClient.auth.signUp({
     *   email: 'newuser@example.com',
     *   password: 'password123'
     * });
     * if (error) {
     *   console.error('Erreur d\'inscription:', error);
     * }
     * ```
     */
    signUp: async (credentials: {
      email: string;
      password: string;
      options?: { emailRedirectTo?: string };
    }): Promise<{ error: any }> => {
      // Import dynamique
      const { hashPassword, generateSalt, validatePasswordStrength } = await import('@/lib/auth');
      const { authStorage } = await import('./authStorage');
      
      // Vérifier la force du mot de passe
      const passwordValidation = validatePasswordStrength(credentials.password);
      if (!passwordValidation.valid) {
        return { error: { message: passwordValidation.errors.join('. ') } };
      }

      const profiles = this.getTable("profiles");
      const existingUser = profiles.find(
        (p: any) => p.email === credentials.email
      );

      if (existingUser || authStorage.emailExists(credentials.email)) {
        return { error: { message: "Cet email est déjà utilisé" } };
      }

      // Générer le hash du mot de passe
      const salt = generateSalt();
      const passwordHash = hashPassword(credentials.password, salt);

      const userId = this.generateId();
      const newProfile = {
        id: userId,
        email: credentials.email,
        username: credentials.email.split("@")[0],
        full_name: credentials.email.split("@")[0],
        avatar_url: null,
        bio: null,
        github_username: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      this.setTable("profiles", [...profiles, newProfile]);

      // Sauvegarder les données d'authentification
      authStorage.save({
        userId,
        email: credentials.email,
        passwordHash,
        salt,
        createdAt: new Date().toISOString(),
      });

      // Créer un rôle utilisateur par défaut
      const roles = this.getTable("user_roles");
      this.setTable("user_roles", [
        ...roles,
        {
          id: this.generateId(),
          user_id: userId,
          role: "user",
          created_at: new Date().toISOString(),
        },
      ]);

      const localUser: LocalUser = {
        id: userId,
        email: credentials.email,
        user_metadata: {
          full_name: newProfile.full_name,
        },
        created_at: newProfile.created_at,
      };

      const session: LocalSession = {
        access_token: this.generateId(),
        user: localUser,
        expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };

      this.storage.setItem(this.authKey, JSON.stringify(session));

      window.dispatchEvent(
        new CustomEvent("auth-state-changed", { detail: { session } })
      );

      return { error: null };
    },

    /**
     * Connecte un utilisateur via OAuth (simulé en mode local)
     * 
     * @param {Object} options - Options de connexion OAuth
     * @param {"github" | "google"} options.provider - Le fournisseur OAuth
     * @param {Object} [options.options] - Options supplémentaires
     * @param {string} [options.options.redirectTo] - URL de redirection après connexion
     * @returns {Promise<{error: any}>} Objet avec une propriété error (null si succès)
     * 
     * @example
     * ```typescript
     * const { error } = await localClient.auth.signInWithOAuth({
     *   provider: 'github',
     *   options: { redirectTo: '/dashboard' }
     * });
     * ```
     */
    signInWithOAuth: async (options: {
      provider: "github" | "google";
      options?: { redirectTo?: string };
    }): Promise<{ error: any }> => {
      try {
        // Import dynamique pour éviter les problèmes de dépendances circulaires
        const { simulateOAuthLogin } = await import('@/lib/oauth');
        const { getOAuthConfig, isEmailAllowed, canAutoCreateUser } = await import('@/lib/oauthConfig');
        
        // Simuler la connexion OAuth
        const oauthProfile = await simulateOAuthLogin(options.provider);

        // Valider que le profil OAuth a un email valide
        if (!oauthProfile.email || !oauthProfile.email.includes('@')) {
          return { error: { message: "Email OAuth invalide" } };
        }

        // Vérifier si l'email est autorisé selon la configuration
        const config = getOAuthConfig();
        if (!isEmailAllowed(oauthProfile.email)) {
          return { error: { message: "Domaine email non autorisé pour OAuth" } };
        }

        const profiles = this.getTable("profiles");
        let user = profiles.find((p: any) => p.email === oauthProfile.email);

        if (!user) {
          // Vérifier si la création automatique est autorisée
          if (!canAutoCreateUser()) {
            return { error: { message: "Aucun compte trouvé avec cet email. Veuillez d'abord créer un compte." } };
          }
          // Créer un nouvel utilisateur depuis le profil OAuth
          const userId = this.generateId();
          user = {
            id: userId,
            email: oauthProfile.email,
            username: oauthProfile.username || oauthProfile.email.split("@")[0],
            full_name: oauthProfile.name,
            avatar_url: oauthProfile.avatar || null,
            bio: null,
            github_username: options.provider === "github" ? oauthProfile.username : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          this.setTable("profiles", [...profiles, user]);

          // Créer un rôle utilisateur par défaut
          const roles = this.getTable("user_roles");
          this.setTable("user_roles", [
            ...roles,
            {
              id: this.generateId(),
              user_id: userId,
              role: "user",
              created_at: new Date().toISOString(),
            },
          ]);

          // Créer des données d'authentification pour OAuth (pas de mot de passe)
          // Les utilisateurs OAuth n'ont pas besoin de mot de passe
          const { authStorage } = await import('./authStorage');
          // On ne crée pas de données d'auth pour OAuth car ils n'ont pas de mot de passe
        } else {
          // Mettre à jour le profil avec les données OAuth
          user.avatar_url = oauthProfile.avatar || user.avatar_url;
          user.full_name = oauthProfile.name || user.full_name;
          if (options.provider === "github" && oauthProfile.username) {
            user.github_username = oauthProfile.username;
          }
          user.updated_at = new Date().toISOString();
          this.setTable("profiles", profiles);
        }

        const localUser: LocalUser = {
          id: user.id,
          email: oauthProfile.email,
          user_metadata: {
            full_name: user.full_name,
            avatar_url: user.avatar_url,
          },
          created_at: user.created_at,
        };

      const session: LocalSession = {
        access_token: this.generateId(),
        user: localUser,
        expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
      };

      this.storage.setItem(this.authKey, JSON.stringify(session));

      window.dispatchEvent(
        new CustomEvent("auth-state-changed", { detail: { session } })
      );

        // Track analytics
        if (typeof window !== 'undefined') {
          try {
            const { analyticsService } = await import('@/services/analyticsService');
            analyticsService.track('oauth_login', { provider: options.provider }, user.id);
          } catch (e) {
            // Ignorer si analytics n'est pas disponible
          }
        }

        // Simuler une redirection
        if (options.options?.redirectTo) {
          setTimeout(() => {
            window.location.href = options.options.redirectTo!;
          }, 100);
        }

        return { error: null };
      } catch (error: any) {
        return { error: { message: error.message || "Erreur lors de la connexion OAuth" } };
      }
    },

    /**
     * Déconnecte l'utilisateur actuel
     * 
     * @returns {Promise<void>}
     * 
     * @example
     * ```typescript
     * await localClient.auth.signOut();
     * ```
     */
    signOut: async (): Promise<void> => {
      this.storage.removeItem(this.authKey);
      window.dispatchEvent(
        new CustomEvent("auth-state-changed", { detail: { session: null } })
      );
    },

    /**
     * S'abonne aux changements d'état d'authentification
     * 
     * @param {Function} callback - Fonction appelée lors des changements d'état
     * @param {string} callback.event - Type d'événement ('SIGNED_IN', 'SIGNED_OUT', etc.)
     * @param {LocalSession | null} callback.session - La session actuelle ou null
     * @returns {{data: {subscription: {unsubscribe: Function}}}} Objet avec méthode unsubscribe
     * 
     * @example
     * ```typescript
     * const { data: { subscription } } = localClient.auth.onAuthStateChange(
     *   (event, session) => {
     *     console.log('État d\'auth changé:', event, session);
     *   }
     * );
     * 
     * // Plus tard, pour se désabonner
     * subscription.unsubscribe();
     * ```
     */
    onAuthStateChange: (
      callback: (event: string, session: LocalSession | null) => void
    ): { data: { subscription: { unsubscribe: () => void } } } => {
      const handler = (e: CustomEvent) => {
        callback("SIGNED_IN", e.detail?.session || null);
      };

      window.addEventListener("auth-state-changed", handler as EventListener);

      // Vérifier la session actuelle
      this.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          callback("SIGNED_IN", session);
        }
      });

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              window.removeEventListener(
                "auth-state-changed",
                handler as EventListener
              );
            },
          },
        },
      };
    },
  };

  /**
   * Démarre une requête sur une table de la base de données
   * 
   * @param {string} table - Le nom de la table
   * @returns {QueryBuilder} Un builder de requête pour chaîner les opérations
   * 
   * @example
   * ```typescript
   * // Sélection simple
   * const { data, error } = await localClient
   *   .from('resources')
   *   .select('*')
   *   .execute();
   * 
   * // Avec filtres
   * const { data } = await localClient
   *   .from('resources')
   *   .select('*, profiles(*)')
   *   .eq('visibility', 'public')
   *   .order('created_at', { ascending: false })
   *   .limit(10)
   *   .execute();
   * ```
   */
  from(table: string) {
    return new QueryBuilder(this, table);
  }

  // Index pour recherches rapides
  private searchIndex: Map<string, Set<string>> = new Map(); // table -> Set of IDs matching search terms

  // Construire l'index de recherche
  private buildSearchIndex() {
    this.searchIndex.clear();

    // Indexer les profils
    const profiles = this.getTable("profiles");
    profiles.forEach((profile: any) => {
      const terms = [
        profile.username?.toLowerCase(),
        profile.full_name?.toLowerCase(),
      ].filter(Boolean);

      terms.forEach((term) => {
        if (term) {
          if (!this.searchIndex.has("profiles")) {
            this.searchIndex.set("profiles", new Set());
          }
          this.searchIndex.get("profiles")!.add(profile.id);
        }
      });
    });

    // Indexer les ressources
    const resources = this.getTable("resources");
    resources.forEach((resource: any) => {
      const terms = [
        resource.title?.toLowerCase(),
        resource.description?.toLowerCase(),
        ...(resource.tags || []).map((t: string) => t.toLowerCase()),
        resource.language?.toLowerCase(),
      ].filter(Boolean);

      terms.forEach((term) => {
        if (term) {
          if (!this.searchIndex.has("resources")) {
            this.searchIndex.set("resources", new Set());
          }
          this.searchIndex.get("resources")!.add(resource.id);
        }
      });
    });
  }

  /**
   * Recherche des utilisateurs par email, username ou nom complet
   * 
   * @param {string} query - Le terme de recherche (minimum 2 caractères)
   * @returns {Promise<{data: any[], error: any}>} Liste des utilisateurs correspondants (max 10)
   * 
   * @example
   * ```typescript
   * const { data, error } = await localClient.searchUsers('john');
   * // Retourne les utilisateurs dont le username ou full_name contient 'john'
   * ```
   */
  async searchUsers(query: string): Promise<{ data: any[]; error: any }> {
    if (!query || query.length < 2) {
      return { data: [], error: null };
    }

    // Reconstruire l'index si nécessaire (peut être optimisé avec un système de cache)
    this.buildSearchIndex();

    const profiles = this.getTable("profiles");
    const queryLower = query.toLowerCase();

    const results = profiles
      .filter((profile: any) => {
        const username = (profile.username || "").toLowerCase();
        const fullName = (profile.full_name || "").toLowerCase();
        return username.includes(queryLower) || fullName.includes(queryLower);
      })
      .slice(0, 10) // Limiter à 10 résultats
      .map((profile: any) => ({
        id: profile.id,
        username: profile.username,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
      }));

    return { data: results, error: null };
  }

  /**
   * Fonctions RPC pour les opérations sur les ressources
   * 
   * @param {string} functionName - Nom de la fonction RPC
   * @param {any} params - Paramètres de la fonction
   * @returns {Promise<any>} Résultat de la fonction
   */
  rpc = async (functionName: string, params: any): Promise<any> => {
    if (functionName === "increment_resource_views") {
      const resources = this.getTable("resources");
      const resource = resources.find((r: any) => r.id === params.resource_id);
      if (resource) {
        resource.views_count = (resource.views_count || 0) + 1;
        resource.updated_at = new Date().toISOString();
        this.setTable("resources", resources);
        
        // Track analytics
        if (typeof window !== 'undefined') {
          const { analyticsService } = await import('@/services/analyticsService');
          analyticsService.track('resource_view', { resourceId: params.resource_id });
        }
      }
      return { data: null, error: null };
    }

    if (functionName === "increment_resource_downloads") {
      const resources = this.getTable("resources");
      const resource = resources.find((r: any) => r.id === params.resource_id);
      if (resource) {
        resource.downloads_count = (resource.downloads_count || 0) + 1;
        resource.updated_at = new Date().toISOString();
        this.setTable("resources", resources);
        
        // Track analytics
        if (typeof window !== 'undefined') {
          const { analyticsService } = await import('@/services/analyticsService');
          analyticsService.track('resource_download', { resourceId: params.resource_id });
        }
      }
      return { data: null, error: null };
    }

    return { data: null, error: { message: "Fonction RPC inconnue" } };
  };

  // Méthodes utilitaires pour gérer les tables
  getTable(tableName: string): any[] {
    const key = this.dbPrefix + tableName;
    const data = this.storage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  setTable(tableName: string, data: any[]): void {
    const key = this.dbPrefix + tableName;
    this.storage.setItem(key, JSON.stringify(data));
  }

  /**
   * Exporte toutes les données de la base de données locale
   * 
   * @returns {Record<string, any[]>} Objet avec toutes les tables et leurs données
   * 
   * @example
   * ```typescript
   * const data = localClient.exportData();
   * // Sauvegarder dans un fichier JSON
   * const json = JSON.stringify(data, null, 2);
   * ```
   */
  public exportData(): Record<string, any[]> {
    const tables = [
      "profiles",
      "resources",
      "saved_resources",
      "resource_ratings",
      "resource_shares",
      "resource_comments",
      "groups",
      "group_members",
      "notifications",
      "category_tag_suggestions",
      "suggestion_votes",
      "user_roles",
      "resource_templates",
      "collections",
      "collection_resources",
      "resource_versions",
    ];

    const data: Record<string, any[]> = {};
    tables.forEach((table) => {
      const tableData = this.getTable(table);
      if (tableData && tableData.length > 0) {
        data[table] = tableData;
      }
    });
    return data;
  }

  /**
   * Importe des données dans la base de données locale
   * 
   * @param {Record<string, any[]>} data - Objet contenant les tables et leurs données
   * 
   * @example
   * ```typescript
   * const importedData = JSON.parse(jsonString);
   * localClient.importData(importedData);
   * ```
   */
  public importData(data: Record<string, any[]>): void {
    Object.keys(data).forEach((table) => {
      if (Array.isArray(data[table])) {
        this.setTable(table, data[table]);
      }
    });
  }

  /**
   * Génère un ID unique pour les enregistrements
   * 
   * @returns {string} Un ID unique basé sur timestamp et random
   * 
   * @example
   * ```typescript
   * const id = localClient.generateId();
   * // "1234567890-abc123def"
   * ```
   */
  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Gestion des canaux (pour les notifications en temps réel)
  private notificationSubscribers: Map<string, Set<(payload: any) => void>> =
    new Map();
  private notificationIntervals: Map<string, NodeJS.Timeout> = new Map();

  channel(name: string) {
    return {
      on: (event: string, config: any, callback: (payload: any) => void) => {
        if (event === "postgres_changes" && config.table === "notifications") {
          // Stocker le callback pour les notifications
          if (!this.notificationSubscribers.has(name)) {
            this.notificationSubscribers.set(name, new Set());
          }
          this.notificationSubscribers.get(name)!.add(callback);

          // Vérifier immédiatement les notifications non lues
          this.auth.getUser().then(({ data: { user } }) => {
            if (user) {
              const notifications = this.getTable("notifications");
              const unread = notifications
                .filter((n: any) => !n.is_read && n.user_id === user.id)
                .sort(
                  (a: any, b: any) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                );

              if (unread.length > 0) {
                // Envoyer la notification la plus récente
                setTimeout(() => {
                  callback({ new: unread[0] });
                }, 100);
              }
            }
          });

          // Polling amélioré avec vérification des changements
          let lastNotificationCount = 0;
          const interval = setInterval(async () => {
            const {
              data: { user },
            } = await this.auth.getUser();
            if (!user) return;

            const notifications = this.getTable("notifications");
            const userNotifications = notifications.filter(
              (n: any) => n.user_id === user.id
            );
            const unread = userNotifications.filter((n: any) => !n.is_read);

            // Si le nombre de notifications non lues a changé, déclencher le callback
            if (unread.length > lastNotificationCount) {
              const newNotifications = unread
                .sort(
                  (a: any, b: any) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                )
                .slice(0, unread.length - lastNotificationCount);

              newNotifications.forEach((notification: any) => {
                callback({ new: notification });
              });
            }

            lastNotificationCount = unread.length;
          }, 2000); // Vérifier toutes les 2 secondes

          this.notificationIntervals.set(name, interval);

          return {
            subscribe: () => ({
              unsubscribe: () => {
                const interval = this.notificationIntervals.get(name);
                if (interval) {
                  clearInterval(interval);
                  this.notificationIntervals.delete(name);
                }
                const subscribers = this.notificationSubscribers.get(name);
                if (subscribers) {
                  subscribers.delete(callback);
                  if (subscribers.size === 0) {
                    this.notificationSubscribers.delete(name);
                  }
                }
              },
            }),
          };
        }

        return {
          subscribe: () => ({ unsubscribe: () => {} }),
        };
      },
      subscribe: () => ({ unsubscribe: () => {} }),
    };
  }

  // Méthode pour déclencher manuellement une notification (utile après création)
  triggerNotification(notification: any) {
    this.notificationSubscribers.forEach((callbacks) => {
      callbacks.forEach((callback) => {
        callback({ new: notification });
      });
    });
  }

  removeChannel: () => void = () => {};
}

// Builder de requêtes pour simuler l'API Supabase
class QueryBuilder {
  private client: LocalClient;
  private table: string;
  private filters: Array<{ type: string; field: string; value: any }> = [];
  private orderBy?: { field: string; ascending: boolean };
  private limitCount?: number;
  private selectFields?: string;
  private singleCalled: boolean = false;

  constructor(client: LocalClient, table: string) {
    this.client = client;
    this.table = table;
  }

  select(fields: string) {
    this.selectFields = fields;
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ type: "eq", field, value });
    return this;
  }

  neq(field: string, value: any) {
    this.filters.push({ type: "neq", field, value });
    return this;
  }

  in(field: string, values: any[]) {
    this.filters.push({ type: "in", field, value: values });
    return this;
  }

  not(field: string, operator: string, value: any) {
    if (operator === "is" && value === null) {
      this.filters.push({ type: "notNull", field, value: null });
    }
    return this;
  }

  or(condition: string) {
    // Simplification: on parse la condition OR
    this.filters.push({ type: "or", field: "", value: condition });
    return this;
  }

  overlaps(field: string, values: any[]) {
    this.filters.push({ type: "overlaps", field, value: values });
    return this;
  }

  order(field: string, options?: { ascending: boolean }) {
    this.orderBy = { field, ascending: options?.ascending ?? true };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  insert(data: any): this {
    const table = this.client.getTable(this.table);
    const newItem = {
      ...data,
      id: data.id || this.client.generateId(),
      created_at: data.created_at || new Date().toISOString(),
      updated_at: data.updated_at || new Date().toISOString(),
    };

    // Gérer les valeurs par défaut selon la table
    if (this.table === "resources") {
      newItem.average_rating = newItem.average_rating ?? 0;
      newItem.ratings_count = newItem.ratings_count ?? 0;
      newItem.downloads_count = newItem.downloads_count ?? 0;
      newItem.views_count = newItem.views_count ?? 0;
      newItem.resource_type = newItem.resource_type || "external_link";
      newItem.visibility = newItem.visibility || "public";
    }
    
    if (this.table === "suggestion_votes") {
      newItem.vote_type = newItem.vote_type || "upvote";
    }

    table.push(newItem);
    this.client.setTable(this.table, table);

    // Stocker l'élément inséré pour le retourner plus tard
    (this as any).insertedItem = newItem;

    return this;
  }

  async executeInsert(): Promise<{ data: any; error: any }> {
    const insertedItem = (this as any).insertedItem;
    if (!insertedItem) {
      return Promise.resolve({
        data: null,
        error: { message: "No item inserted" },
      });
    }

    // Si select() a été appelé, retourner l'élément avec les relations
    if (this.selectFields) {
      const result = await this.processRelations([insertedItem]);
      // Si single() a été appelé, retourner un seul élément
      if (this.singleCalled) {
        return Promise.resolve({ data: result[0] || null, error: null });
      }
      return Promise.resolve({ data: result, error: null });
    }

    return Promise.resolve({ data: [insertedItem], error: null });
  }

  async update(data: any): Promise<{ error: any }> {
    const table = this.client.getTable(this.table);
    const filtered = this.applyFilters(table);

    filtered.forEach((item: any) => {
      Object.assign(item, {
        ...data,
        updated_at: new Date().toISOString(),
      });
    });

    this.client.setTable(this.table, table);
    return Promise.resolve({ error: null });
  }

  async delete(): Promise<{ error: any }> {
    const table = this.client.getTable(this.table);
    const filtered = this.applyFilters(table);
    const filteredIds = new Set(filtered.map((item: any) => item.id));

    const newTable = table.filter((item: any) => !filteredIds.has(item.id));
    this.client.setTable(this.table, newTable);

    return Promise.resolve({ error: null });
  }

  async upsert(
    data: any,
    options?: { onConflict?: string }
  ): Promise<{ error: any }> {
    const table = this.client.getTable(this.table);

    if (options?.onConflict) {
      const [field1, field2] = options.onConflict.split(",");
      const existing = table.find(
        (item: any) =>
          item[field1.trim()] === data[field1.trim()] &&
          item[field2.trim()] === data[field2.trim()]
      );

      if (existing) {
        Object.assign(existing, {
          ...data,
          updated_at: new Date().toISOString(),
        });
      } else {
        table.push({
          ...data,
          id: data.id || this.client.generateId(),
          created_at: data.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } else {
      const existing = table.find((item: any) => item.id === data.id);
      if (existing) {
        Object.assign(existing, {
          ...data,
          updated_at: new Date().toISOString(),
        });
      } else {
        table.push({
          ...data,
          id: data.id || this.client.generateId(),
          created_at: data.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    this.client.setTable(this.table, table);
    return { error: null };
  }

  async single(): Promise<{ data: any; error: any }> {
    const result = await this.execute();
    if (result.data && result.data.length > 0) {
      return { data: result.data[0], error: null };
    }
    return { data: null, error: { message: "No rows found" } };
  }

  async maybeSingle(): Promise<{ data: any; error: any }> {
    const result = await this.execute();
    if (result.data && result.data.length > 0) {
      return { data: result.data[0], error: null };
    }
    return { data: null, error: null };
  }

  async execute(): Promise<{ data: any; error: any }> {
    let table = this.client.getTable(this.table);

    // Appliquer les filtres
    table = this.applyFilters(table);

    // Appliquer le tri
    if (this.orderBy) {
      table.sort((a: any, b: any) => {
        const aVal = a[this.orderBy!.field];
        const bVal = b[this.orderBy!.field];
        if (this.orderBy!.ascending) {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });
    }

    // Appliquer la limite
    if (this.limitCount) {
      table = table.slice(0, this.limitCount);
    }

    // Traiter les relations si select() a été appelé
    if (this.selectFields) {
      table = await this.processRelations(table);
    }

    return { data: table, error: null };
  }

  private async processRelations(table: any[]): Promise<any[]> {
    // Gérer les relations profiles!inner
    if (this.selectFields && this.selectFields.includes("profiles")) {
      const profiles = this.client.getTable("profiles");
      table = table
        .map((item: any) => {
          const profile = profiles.find((p: any) => p.id === item.user_id);
          if (this.selectFields?.includes("profiles!inner")) {
            // Pour !inner, on filtre les éléments sans profil
            if (!profile) return null;
          }
          return {
            ...item,
            profiles: profile
              ? {
                  username: profile.username,
                  full_name: profile.full_name,
                  avatar_url: profile.avatar_url,
                }
              : null,
          };
        })
        .filter((item: any) => item !== null);
    }

    // Gérer les relations imbriquées (comme resources!inner)
    if (this.selectFields && this.selectFields.includes("resources")) {
      const resources = this.client.getTable("resources");
      table = table.map((item: any) => {
        const resource = resources.find((r: any) => r.id === item.resource_id);
        if (resource) {
          const profiles = this.client.getTable("profiles");
          const profile = profiles.find((p: any) => p.id === resource.user_id);
          return {
            ...item,
            resources: {
              ...resource,
              profiles: profile
                ? {
                    username: profile.username,
                    full_name: profile.full_name,
                    avatar_url: profile.avatar_url,
                  }
                : null,
            },
          };
        }
        return item;
      });
    }

    // Gérer les relations de groupes
    if (this.selectFields && this.selectFields.includes("groups")) {
      const groups = this.client.getTable("groups");
      const groupMembers = this.client.getTable("group_members");
      table = table.map((item: any) => {
        const group = groups.find(
          (g: any) => g.id === item.shared_with_group_id
        );
        if (group) {
          const members = groupMembers.filter(
            (m: any) => m.group_id === group.id
          );
          return {
            ...item,
            groups: {
              ...group,
              group_members: members,
            },
          };
        }
        return item;
      });
    }

    // Gérer les votes de suggestions
    if (this.selectFields && this.selectFields.includes("suggestion_votes")) {
      const votes = this.client.getTable("suggestion_votes");
      table = table.map((item: any) => {
        const itemVotes = votes.filter((v: any) => v.suggestion_id === item.id);
        return {
          ...item,
          suggestion_votes: itemVotes,
        };
      });
    }

    return table;
  }

  private applyFilters(table: any[]): any[] {
    return table.filter((item: any) => {
      return this.filters.every((filter) => {
        switch (filter.type) {
          case "eq":
            return item[filter.field] === filter.value;
          case "neq":
            return item[filter.field] !== filter.value;
          case "in": {
            return (
              Array.isArray(filter.value) &&
              filter.value.includes(item[filter.field])
            );
          }
          case "notNull": {
            return (
              item[filter.field] !== null && item[filter.field] !== undefined
            );
          }
          case "or": {
            // Recherche full-text améliorée dans title, description, tags, readme
            const searchTerm = filter.value
              .replace(/.*ilike\.%(.+)%.*/, "$1")
              .toLowerCase();
            const searchTerms = searchTerm
              .split(" ")
              .filter((t) => t.length > 0);

            // Recherche dans tous les champs pertinents
            const searchableText = [
              item.title,
              item.description,
              item.readme,
              item.language,
              Array.isArray(item.tags) ? item.tags.join(" ") : "",
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            // Tous les termes doivent être trouvés (AND) ou au moins un (OR selon le contexte)
            return searchTerms.some((term) => searchableText.includes(term));
          }
          case "overlaps":
            // Pour les tableaux (tags)
            if (
              Array.isArray(item[filter.field]) &&
              Array.isArray(filter.value)
            ) {
              return item[filter.field].some((tag: string) =>
                filter.value.some(
                  (v: string) => tag.toLowerCase() === v.toLowerCase()
                )
              );
            }
            return false;
          default:
            return true;
        }
      });
    });
  }
}

export const localClient = new LocalClient();
