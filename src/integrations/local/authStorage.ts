/**
 * Gestion du stockage des authentifications
 * Stocke les hash de mots de passe de manière sécurisée
 */

export interface AuthData {
  userId: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  lastLogin?: string;
}

const AUTH_STORAGE_KEY = 'hub-lib-auth-data';

class AuthStorage {
  private storage: Storage;

  constructor() {
    this.storage = localStorage;
  }

  /**
   * Récupère toutes les données d'authentification
   */
  getAll(): AuthData[] {
    const data = this.storage.getItem(AUTH_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Récupère les données d'authentification pour un email
   */
  getByEmail(email: string): AuthData | null {
    const all = this.getAll();
    return all.find(auth => auth.email === email) || null;
  }

  /**
   * Récupère les données d'authentification pour un userId
   */
  getByUserId(userId: string): AuthData | null {
    const all = this.getAll();
    return all.find(auth => auth.userId === userId) || null;
  }

  /**
   * Sauvegarde les données d'authentification
   */
  save(authData: AuthData): void {
    const all = this.getAll();
    const existingIndex = all.findIndex(auth => auth.email === authData.email);
    
    if (existingIndex >= 0) {
      all[existingIndex] = authData;
    } else {
      all.push(authData);
    }
    
    this.storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(all));
  }

  /**
   * Met à jour la dernière connexion
   */
  updateLastLogin(email: string): void {
    const authData = this.getByEmail(email);
    if (authData) {
      authData.lastLogin = new Date().toISOString();
      this.save(authData);
    }
  }

  /**
   * Supprime les données d'authentification
   */
  delete(email: string): void {
    const all = this.getAll();
    const filtered = all.filter(auth => auth.email !== email);
    this.storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(filtered));
  }

  /**
   * Vérifie si un email existe
   */
  emailExists(email: string): boolean {
    return this.getByEmail(email) !== null;
  }
}

export const authStorage = new AuthStorage();


