/**
 * Script pour exporter les données depuis localStorage vers un format JSON
 * Peut être utilisé pour migrer les données vers PostgreSQL via l'API backend
 */

interface ExportData {
  metadata: {
    exportDate: string;
    exportVersion: string;
    tables: string[];
  };
  tables: Record<string, unknown[]>;
  auth?: {
    session?: unknown;
    user?: unknown;
  };
  authData?: Array<{
    userId: string;
    email: string;
    passwordHash: string;
    salt: string;
    createdAt: string;
    lastLogin?: string;
  }>;
  analytics?: Array<{
    id: string;
    type: string;
    userId?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    timestamp: string;
  }>;
}

/**
 * Exporte toutes les données depuis localStorage
 */
export function exportLocalStorageData(): ExportData {
  const dbPrefix = 'hub-lib-db-';
  const authKey = 'hub-lib-auth';
  const authDataKey = 'hub-lib-auth-data';
  const analyticsKey = 'hub-lib-analytics';

  const tables = [
    'profiles',
    'resources',
    'saved_resources',
    'resource_ratings',
    'resource_shares',
    'resource_comments',
    'groups',
    'group_members',
    'notifications',
    'category_tag_suggestions',
    'suggestion_votes',
    'user_roles',
    'resource_templates',
    'collections',
    'collection_resources',
    'admin_config',
    'category_hierarchy',
    'category_filters',
  ];

  const exportedTables: Record<string, unknown[]> = {};

  // Exporter chaque table
  for (const table of tables) {
    const key = dbPrefix + table;
    const data = localStorage.getItem(key);
    if (data) {
      try {
        exportedTables[table] = JSON.parse(data);
      } catch (error) {
        console.error(`Erreur lors de l'export de la table ${table}:`, error);
        exportedTables[table] = [];
      }
    } else {
      exportedTables[table] = [];
    }
  }

  // Exporter l'authentification
  const authData = localStorage.getItem(authKey);
  let auth: { session?: unknown; user?: unknown } | undefined;
  if (authData) {
    try {
      auth = JSON.parse(authData);
    } catch (error) {
      console.error('Erreur lors de l\'export de l\'authentification:', error);
    }
  }

  // Exporter les données d'authentification (mots de passe hashés)
  const authDataStorage = localStorage.getItem(authDataKey);
  let authDataArray: ExportData['authData'];
  if (authDataStorage) {
    try {
      authDataArray = JSON.parse(authDataStorage);
    } catch (error) {
      console.error('Erreur lors de l\'export des données d\'authentification:', error);
    }
  }

  // Exporter les analytics
  const analyticsData = localStorage.getItem(analyticsKey);
  let analytics: ExportData['analytics'];
  if (analyticsData) {
    try {
      analytics = JSON.parse(analyticsData);
    } catch (error) {
      console.error('Erreur lors de l\'export des analytics:', error);
    }
  }

  return {
    metadata: {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0.0',
      tables,
    },
    tables: exportedTables,
    auth,
    authData: authDataArray,
    analytics,
  };
}

/**
 * Télécharge les données exportées en tant que fichier JSON
 */
export function downloadExportFile(): void {
  const data = exportLocalStorageData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hub-lib-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Envoie les données exportées vers l'API backend pour migration
 */
export async function migrateToBackend(apiUrl: string = 'http://localhost:3001'): Promise<{ success: boolean; message: string }> {
  const data = exportLocalStorageData();
  
  try {
    // Récupérer le token d'authentification
    const authData = localStorage.getItem('hub-lib-auth');
    let token: string | null = null;
    
    if (authData) {
      try {
        const auth = JSON.parse(authData);
        token = auth?.access_token || null;
      } catch {
        // Ignorer les erreurs de parsing
      }
    }

    const response = await fetch(`${apiUrl}/api/migration/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return {
      success: true,
      message: result.message || 'Migration réussie',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erreur lors de la migration',
    };
  }
}

