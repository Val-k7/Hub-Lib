/**
 * Script d'import des données vers PostgreSQL
 * 
 * Usage:
 *   npx tsx scripts/import-to-postgres.ts <export-file.json>
 * 
 * Importe les données exportées depuis localStorage vers PostgreSQL via l'API backend
 */

import * as fs from 'fs';
import * as path from 'path';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const ACCESS_TOKEN = process.env.ACCESS_TOKEN || '';

interface ImportResult {
  success: boolean;
  imported: Record<string, number>;
  errors: string[];
  warnings: string[];
  summary: {
    totalImported: number;
    tablesImported: number;
    errors: number;
    warnings: number;
  };
}

/**
 * Lit le fichier d'export JSON
 */
function readExportFile(filePath: string): any {
  const fullPath = path.resolve(filePath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Fichier non trouvé: ${fullPath}`);
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Valide les données avant import
 */
async function validateImport(data: any): Promise<boolean> {
  console.log('🔍 Validation des données...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/migration/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ACCESS_TOKEN ? { Authorization: `Bearer ${ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Validation échouée: ${JSON.stringify(error)}`);
    }

    const validation = await response.json();
    
    if (!validation.valid) {
      console.error('❌ Validation échouée:');
      validation.errors.forEach((err: string) => console.error(`   - ${err}`));
      validation.warnings.forEach((warn: string) => console.warn(`   ⚠️  ${warn}`));
      return false;
    }

    console.log('✅ Validation réussie');
    if (validation.warnings.length > 0) {
      console.warn('⚠️  Avertissements:');
      validation.warnings.forEach((warn: string) => console.warn(`   - ${warn}`));
    }

    console.log('📊 Statistiques:');
    Object.entries(validation.statistics).forEach(([table, stats]: [string, any]) => {
      console.log(`   - ${table}: ${stats.count} enregistrements`);
    });

    return true;
  } catch (error: any) {
    console.error('❌ Erreur lors de la validation:', error.message);
    return false;
  }
}

/**
 * Importe les données vers PostgreSQL
 */
async function importData(data: any): Promise<ImportResult> {
  console.log('📦 Import des données...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/migration/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ACCESS_TOKEN ? { Authorization: `Bearer ${ACCESS_TOKEN}` } : {}),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Import échoué: ${JSON.stringify(error)}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'import:', error.message);
    throw error;
  }
}

/**
 * Fonction principale
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: npx tsx scripts/import-to-postgres.ts <export-file.json>');
    console.error('');
    console.error('Options:');
    console.error('  --token <token>    Token d\'accès pour l\'API');
    console.error('  --url <url>        URL de l\'API (défaut: http://localhost:3000)');
    console.error('  --skip-validation  Ignorer la validation');
    process.exit(1);
  }

  const filePath = args[0];
  const skipValidation = args.includes('--skip-validation');
  const tokenIndex = args.indexOf('--token');
  const urlIndex = args.indexOf('--url');

  if (tokenIndex >= 0 && args[tokenIndex + 1]) {
    process.env.ACCESS_TOKEN = args[tokenIndex + 1];
  }

  if (urlIndex >= 0 && args[urlIndex + 1]) {
    process.env.API_BASE_URL = args[urlIndex + 1];
  }

  console.log('🚀 Début de l\'import des données');
  console.log(`   - Fichier: ${filePath}`);
  console.log(`   - API: ${API_BASE_URL}`);
  console.log(`   - Token: ${ACCESS_TOKEN ? 'Oui' : 'Non'}\n`);

  try {
    // 1. Lire le fichier d'export
    console.log('📖 Lecture du fichier d\'export...');
    const exportData = readExportFile(filePath);
    console.log(`✅ Fichier lu: ${exportData.metadata?.exportDate || 'Date inconnue'}`);

    // 2. Valider les données (optionnel)
    if (!skipValidation) {
      const isValid = await validateImport(exportData);
      if (!isValid) {
        console.error('\n❌ La validation a échoué. Utilisez --skip-validation pour forcer l\'import.');
        process.exit(1);
      }
      console.log('');
    }

    // 3. Demander confirmation
    console.log('⚠️  Attention: Cette opération va importer les données dans PostgreSQL.');
    console.log('   Assurez-vous que la base de données est vide ou que vous acceptez les doublons.\n');
    
    // En mode non-interactif, on continue automatiquement
    // Pour un mode interactif, ajouter une question ici

    // 4. Importer les données
    const result = await importData(exportData);

    // 5. Afficher les résultats
    console.log('\n📊 Résultats de l\'import:');
    console.log(`   ✅ Succès: ${result.success ? 'Oui' : 'Non'}`);
    console.log(`   📦 Total importé: ${result.summary.totalImported} enregistrements`);
    console.log(`   📋 Tables: ${result.summary.tablesImported}`);
    console.log(`   ⚠️  Avertissements: ${result.summary.warnings}`);
    console.log(`   ❌ Erreurs: ${result.summary.errors}\n`);

    if (Object.keys(result.imported).length > 0) {
      console.log('📋 Détails par table:');
      Object.entries(result.imported).forEach(([table, count]) => {
        console.log(`   - ${table}: ${count} enregistrements`);
      });
      console.log('');
    }

    if (result.errors.length > 0) {
      console.error('❌ Erreurs:');
      result.errors.forEach((err) => console.error(`   - ${err}`));
      console.log('');
    }

    if (result.warnings.length > 0) {
      console.warn('⚠️  Avertissements:');
      result.warnings.forEach((warn) => console.warn(`   - ${warn}`));
      console.log('');
    }

    if (result.success) {
      console.log('✅ Import terminé avec succès !');
      process.exit(0);
    } else {
      console.error('❌ Import terminé avec des erreurs.');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ Erreur fatale:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécuter le script
main();

