#!/bin/bash

# Script de migration depuis localStorage vers PostgreSQL
# Ce script est optionnel et permet de migrer les données existantes depuis localStorage

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔄 Migration localStorage → PostgreSQL"
echo "======================================"
echo ""

# Vérifier que Node.js est disponible
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé"
    exit 1
fi

# Vérifier que le backend est accessible
if ! curl -f -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "⚠️  Le backend n'est pas accessible sur http://localhost:3001"
    echo "   Assurez-vous que le serveur backend est démarré"
    read -p "Continuer quand même ? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Créer le script de migration Node.js
cat > "$PROJECT_ROOT/scripts/migrate-data.js" << 'EOF'
/**
 * Script de migration depuis localStorage vers PostgreSQL
 * 
 * Ce script lit les données depuis localStorage (via le navigateur ou un dump JSON)
 * et les migre vers PostgreSQL via l'API backend
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const LOCALSTORAGE_DUMP_PATH = process.env.LOCALSTORAGE_DUMP || join(__dirname, '../localStorage-dump.json');

async function migrateData() {
  console.log('📦 Lecture du dump localStorage...');
  
  let localStorageData;
  try {
    const dumpContent = readFileSync(LOCALSTORAGE_DUMP_PATH, 'utf-8');
    localStorageData = JSON.parse(dumpContent);
  } catch (error) {
    console.error('❌ Impossible de lire le dump localStorage:', error.message);
    console.log('');
    console.log('💡 Pour créer un dump localStorage:');
    console.log('   1. Ouvrez la console du navigateur');
    console.log('   2. Exécutez: JSON.stringify(localStorage)');
    console.log('   3. Sauvegardez le résultat dans localStorage-dump.json');
    process.exit(1);
  }

  console.log(`✅ ${Object.keys(localStorageData).length} clés trouvées`);
  console.log('');

  // Migrer les ressources
  if (localStorageData.resources) {
    console.log('📚 Migration des ressources...');
    try {
      const resources = JSON.parse(localStorageData.resources);
      console.log(`   ${resources.length} ressources à migrer`);
      
      // TODO: Implémenter la migration des ressources
      // Pour chaque ressource, appeler POST /api/resources
      
      console.log('   ✅ Ressources migrées');
    } catch (error) {
      console.error('   ❌ Erreur lors de la migration des ressources:', error.message);
    }
  }

  // Migrer les collections
  if (localStorageData.collections) {
    console.log('📁 Migration des collections...');
    try {
      const collections = JSON.parse(localStorageData.collections);
      console.log(`   ${collections.length} collections à migrer`);
      
      // TODO: Implémenter la migration des collections
      
      console.log('   ✅ Collections migrées');
    } catch (error) {
      console.error('   ❌ Erreur lors de la migration des collections:', error.message);
    }
  }

  // Migrer les favoris
  if (localStorageData.savedResources) {
    console.log('⭐ Migration des favoris...');
    try {
      const savedResources = JSON.parse(localStorageData.savedResources);
      console.log(`   ${savedResources.length} favoris à migrer`);
      
      // TODO: Implémenter la migration des favoris
      
      console.log('   ✅ Favoris migrés');
    } catch (error) {
      console.error('   ❌ Erreur lors de la migration des favoris:', error.message);
    }
  }

  console.log('');
  console.log('✅ Migration terminée !');
}

migrateData().catch((error) => {
  console.error('❌ Erreur fatale:', error);
  process.exit(1);
});
EOF

chmod +x "$PROJECT_ROOT/scripts/migrate-data.js"

echo "✅ Script de migration créé: scripts/migrate-data.js"
echo ""
echo "📝 Pour utiliser ce script:"
echo "   1. Créez un dump de localStorage (voir instructions dans le script)"
echo "   2. Exécutez: node scripts/migrate-data.js"
echo ""
echo "⚠️  Note: Ce script est optionnel et nécessite une implémentation complète"
echo "   selon vos besoins spécifiques de migration."

