/**
 * Utilitaires d'authentification réelle
 * Hash et vérification de mots de passe
 */

import CryptoJS from 'crypto-js';

const SALT_KEY = 'hub-lib-auth-salt';

/**
 * Génère un salt unique pour chaque utilisateur
 */
export function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(128/8).toString();
}

/**
 * Hash un mot de passe avec un salt
 */
export function hashPassword(password: string, salt: string): string {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
    iterations: 10000
  }).toString();
}

/**
 * Vérifie un mot de passe contre un hash
 */
export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const passwordHash = hashPassword(password, salt);
  return passwordHash === hash;
}

/**
 * Génère un token d'authentification sécurisé
 */
export function generateAuthToken(): string {
  return CryptoJS.lib.WordArray.random(256/8).toString();
}

/**
 * Valide la force d'un mot de passe
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}


