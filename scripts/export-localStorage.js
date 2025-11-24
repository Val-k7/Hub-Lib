/**
 * Script d'export des données depuis localStorage
 * 
 * Usage:
 *   - Ouvrir la console du navigateur
 *   - Copier/coller ce script
 *   - Ou l'exécuter depuis la console: await exportLocalStorage()
 * 
 * Exporte toutes les données localStorage vers un objet JSON
 */

/**
 * Liste des tables à exporter depuis localStorage
 */
const TABLES = [
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
  'resource_versions',
];

const DB_PREFIX = 'hub-lib-db-';
const AUTH_KEY = 'hub-lib-auth';
const AUTH_DATA_KEY = 'hub-lib-auth-data';
const ANALYTICS_KEY = 'hub-lib-analytics';

/**
 * Exporte toutes les données depuis localStorage
 * @returns {Object} Objet contenant toutes les données exportées
 */
function exportLocalStorage() {
  console.log('🔄 Début de l\'export des données depuis localStorage...');
  
  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0.0',
      tables: TABLES,
    },
    tables: {},
    auth: null,
    authData: null,
    analytics: null,
  };

  // Exporter les tables
  TABLES.forEach((table) => {
    const key = `${DB_PREFIX}${table}`;
    const data = localStorage.getItem(key);
    
    if (data) {
      try {
        const parsed = JSON.parse(data);
        exportData.tables[table] = parsed;
        console.log(`✅ Table "${table}" exportée: ${parsed.length} enregistrements`);
      } catch (error) {
        console.error(`❌ Erreur lors du parsing de la table "${table}":`, error);
        exportData.tables[table] = [];
      }
    } else {
      console.log(`⚠️  Table "${table}" non trouvée dans localStorage`);
      exportData.tables[table] = [];
    }
  });

  // Exporter l'authentification
  const authData = localStorage.getItem(AUTH_KEY);
  if (authData) {
    try {
      exportData.auth = JSON.parse(authData);
      console.log('✅ Session d\'authentification exportée');
    } catch (error) {
      console.error('❌ Erreur lors de l\'export de l\'authentification:', error);
    }
  }

  // Exporter les données d'authentification (authStorage)
  const authStorageData = localStorage.getItem(AUTH_DATA_KEY);
  if (authStorageData) {
    try {
      exportData.authData = JSON.parse(authStorageData);
      console.log('✅ Données d\'authentification exportées');
    } catch (error) {
      console.error('❌ Erreur lors de l\'export des données d\'authentification:', error);
    }
  }

  // Exporter les analytics
  const analyticsData = localStorage.getItem(ANALYTICS_KEY);
  if (analyticsData) {
    try {
      exportData.analytics = JSON.parse(analyticsData);
      console.log('✅ Données analytics exportées');
    } catch (error) {
      console.error('❌ Erreur lors de l\'export des analytics:', error);
    }
  }

  // Statistiques
  const totalRecords = Object.values(exportData.tables).reduce((sum, table) => sum + table.length, 0);
  console.log(`\n📊 Export terminé:`);
  console.log(`   - ${TABLES.length} tables exportées`);
  console.log(`   - ${totalRecords} enregistrements au total`);
  console.log(`   - Session: ${exportData.auth ? 'Oui' : 'Non'}`);
  console.log(`   - Auth Data: ${exportData.authData ? 'Oui' : 'Non'}`);
  console.log(`   - Analytics: ${exportData.analytics ? 'Oui' : 'Non'}`);

  return exportData;
}

/**
 * Télécharge les données exportées en tant que fichier JSON
 */
function downloadExport() {
  const data = exportLocalStorage();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hub-lib-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log('✅ Fichier JSON téléchargé');
}

/**
 * Affiche les données exportées dans la console (pour inspection)
 */
function previewExport() {
  const data = exportLocalStorage();
  console.log('📋 Aperçu des données exportées:', data);
  return data;
}

// Exposer les fonctions globalement si exécuté dans un navigateur
if (typeof window !== 'undefined') {
  window.exportLocalStorage = exportLocalStorage;
  window.downloadExport = downloadExport;
  window.previewExport = previewExport;
  console.log('✅ Script d\'export chargé. Utilisez:');
  console.log('   - exportLocalStorage() pour exporter');
  console.log('   - downloadExport() pour télécharger en JSON');
  console.log('   - previewExport() pour voir l\'aperçu');
}

// Export pour usage en module
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    exportLocalStorage,
    downloadExport,
    previewExport,
    TABLES,
    DB_PREFIX,
    AUTH_KEY,
    AUTH_DATA_KEY,
    ANALYTICS_KEY,
  };
}


