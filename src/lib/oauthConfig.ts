/**
 * Configuration OAuth
 * Contrôle le comportement de l'authentification OAuth
 */

export interface OAuthConfig {
  /**
   * Autorise la création automatique d'utilisateurs via OAuth
   * Si false, seuls les utilisateurs existants peuvent se connecter via OAuth
   */
  allowAutoCreate: boolean;
  
  /**
   * Exige que l'email OAuth corresponde à un domaine autorisé
   * Exemple: ['@github.com', '@gmail.com']
   */
  allowedEmailDomains?: string[];
  
  /**
   * Mode simulation (pour développement)
   * Si true, génère des profils aléatoires au lieu d'utiliser les vraies APIs
   */
  simulationMode: boolean;
}

const defaultConfig: OAuthConfig = {
  allowAutoCreate: true, // Par défaut, on autorise la création automatique
  simulationMode: true, // En mode local, on simule
};

let currentConfig: OAuthConfig = { ...defaultConfig };

/**
 * Configure le comportement OAuth
 */
export function configureOAuth(config: Partial<OAuthConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Récupère la configuration OAuth actuelle
 */
export function getOAuthConfig(): OAuthConfig {
  return { ...currentConfig };
}

/**
 * Vérifie si un email est autorisé selon la configuration
 */
export function isEmailAllowed(email: string): boolean {
  if (!currentConfig.allowedEmailDomains || currentConfig.allowedEmailDomains.length === 0) {
    return true; // Pas de restriction
  }

  return currentConfig.allowedEmailDomains.some(domain => email.endsWith(domain));
}

/**
 * Vérifie si la création automatique est autorisée
 */
export function canAutoCreateUser(): boolean {
  return currentConfig.allowAutoCreate;
}


