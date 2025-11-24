/**
 * Utilitaires de chiffrement pour les tokens OAuth
 * Utilise AES-256-GCM pour un chiffrement sécurisé
 */

import crypto from 'crypto';
import { env } from '../config/env.js';
import { logger } from './logger.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes pour AES
const SALT_LENGTH = 64; // 64 bytes pour le salt
const TAG_LENGTH = 16; // 16 bytes pour l'authentification tag
const KEY_LENGTH = 32; // 32 bytes pour AES-256

/**
 * Génère une clé de chiffrement à partir d'un secret
 */
function deriveKey(secret: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Chiffre un texte en utilisant AES-256-GCM
 */
export function encrypt(text: string): string {
  try {
    const encryptionKey = env.JWT_SECRET || process.env.OAUTH_ENCRYPTION_KEY || 'default-key-change-in-production';
    
    if (encryptionKey.length < 32) {
      logger.warn('⚠️  La clé de chiffrement OAuth est trop courte. Utilisez au moins 32 caractères.');
    }

    // Générer un salt unique pour chaque chiffrement
    const salt = crypto.randomBytes(SALT_LENGTH);
    const key = deriveKey(encryptionKey, salt);
    
    // Générer un IV unique
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Créer le cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Chiffrer le texte
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Récupérer le tag d'authentification
    const tag = cipher.getAuthTag();
    
    // Combiner salt + iv + tag + encrypted
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex'),
    ]);
    
    // Retourner en base64 pour faciliter le stockage
    return combined.toString('base64');
  } catch (error) {
    logger.error('Erreur lors du chiffrement:', error);
    throw new Error('Échec du chiffrement');
  }
}

/**
 * Déchiffre un texte chiffré avec AES-256-GCM
 */
export function decrypt(encryptedText: string): string {
  try {
    const encryptionKey = env.JWT_SECRET || process.env.OAUTH_ENCRYPTION_KEY || 'default-key-change-in-production';
    
    // Décoder depuis base64
    const combined = Buffer.from(encryptedText, 'base64');
    
    // Extraire les composants
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Dériver la clé
    const key = deriveKey(encryptionKey, salt);
    
    // Créer le decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    // Déchiffrer
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    logger.error('Erreur lors du déchiffrement:', error);
    throw new Error('Échec du déchiffrement - token invalide ou corrompu');
  }
}

