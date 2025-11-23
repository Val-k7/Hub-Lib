/**
 * Utilitaires de migration pour la compatibilité avec les données existantes
 */

import { localClient } from '@/integrations/local/client';
import { authStorage } from '@/integrations/local/authStorage';
import { hashPassword, generateSalt } from './auth';

/**
 * Migre les utilisateurs existants vers le nouveau système d'authentification
 * Crée des données d'authentification pour les utilisateurs qui n'en ont pas
 */
export async function migrateLegacyUsers(): Promise<{
  migrated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let migrated = 0;

  try {
    // Récupérer tous les profils
    const { data: profiles } = await localClient
      .from('profiles')
      .select('*')
      .execute();

    if (!profiles || profiles.length === 0) {
      return { migrated: 0, errors: [] };
    }

    // Pour chaque profil, vérifier s'il a des données d'authentification
    for (const profile of profiles) {
      // Vérifier si l'utilisateur a un email (nécessaire pour l'auth)
      if (!profile.email) {
        continue;
      }

      // Vérifier si des données d'auth existent déjà
      const existingAuth = authStorage.getByEmail(profile.email);
      if (existingAuth) {
        continue; // Déjà migré
      }

      // Créer des données d'authentification avec un mot de passe par défaut
      // L'utilisateur devra réinitialiser son mot de passe
      try {
        const salt = generateSalt();
        // Générer un hash pour un mot de passe temporaire
        // L'utilisateur devra utiliser "reset" comme mot de passe la première fois
        const defaultPassword = 'reset';
        const passwordHash = hashPassword(defaultPassword, salt);

        authStorage.save({
          userId: profile.id,
          email: profile.email,
          passwordHash,
          salt,
          createdAt: profile.created_at || new Date().toISOString(),
        });

        migrated++;
      } catch (error: any) {
        errors.push(`Erreur pour ${profile.email}: ${error.message}`);
      }
    }
  } catch (error: any) {
    errors.push(`Erreur générale: ${error.message}`);
  }

  return { migrated, errors };
}

/**
 * Vérifie si un utilisateur est un utilisateur legacy (sans données d'auth)
 */
export function isLegacyUser(email: string): boolean {
  const profiles = localClient.getTable('profiles');
  const user = profiles.find((p: any) => p.email === email);
  
  if (!user) {
    return false;
  }

  const authData = authStorage.getByEmail(email);
  return !authData;
}

/**
 * Initialise les tables manquantes pour les nouvelles fonctionnalités
 */
export function initializeMissingTables(): void {
  const tables = [
    'resource_templates',
    'collections',
    'collection_resources',
    'resource_versions',
  ];

  tables.forEach((table) => {
    const key = `hub-lib-db-${table}`;
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify([]));
    }
  });
}


