/**
 * Intégration OAuth réelle avec le backend
 * Redirige vers les routes OAuth du backend
 */

export interface OAuthProfile {
  provider: 'github' | 'google';
  id: string;
  email: string;
  name: string;
  avatar?: string;
  username?: string;
}

/**
 * Redirige vers la route OAuth du backend pour initier la connexion
 * @param provider - Le provider OAuth ('github' ou 'google')
 * @param redirectTo - URL de redirection après authentification (optionnel)
 */
export async function initiateOAuthLogin(
  provider: 'github' | 'google',
  redirectTo?: string
): Promise<void> {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const oauthUrl = `${apiUrl}/api/auth/oauth/${provider}`;
  
  // Ajouter le paramètre state avec l'URL de redirection si fournie
  const params = new URLSearchParams();
  if (redirectTo) {
    params.set('redirectTo', redirectTo);
  }
  
  const fullUrl = params.toString() 
    ? `${oauthUrl}?${params.toString()}`
    : oauthUrl;
  
  // Rediriger vers la route OAuth du backend
  window.location.href = fullUrl;
}

/**
 * Gère le callback OAuth depuis l'URL
 * Récupère les tokens depuis les paramètres de l'URL et les stocke
 * @returns Les tokens OAuth ou null si erreur
 */
export function handleOAuthCallback(): { tokens?: { accessToken: string; refreshToken: string; expiresIn: number }; error?: string } | null {
  const urlParams = new URLSearchParams(window.location.search);
  const oauthParam = urlParams.get('oauth');
  const tokensParam = urlParams.get('tokens');
  const errorParam = urlParams.get('error');
  const messageParam = urlParams.get('message');

  // Nettoyer l'URL
  const cleanUrl = window.location.pathname;
  window.history.replaceState({}, document.title, cleanUrl);

  if (errorParam) {
    return {
      error: messageParam ? decodeURIComponent(messageParam) : 'Erreur OAuth',
    };
  }

  if (oauthParam === 'success' && tokensParam) {
    try {
      const tokens = JSON.parse(decodeURIComponent(tokensParam));
      return { tokens };
    } catch (error) {
      return {
        error: 'Erreur lors du parsing des tokens',
      };
    }
  }

  return null;
}

/**
 * Récupère le profil OAuth depuis sessionStorage (pour compatibilité)
 * @deprecated Utiliser les tokens JWT du backend
 */
export function getOAuthProfile(provider: 'github' | 'google'): OAuthProfile | null {
  const stored = sessionStorage.getItem(`oauth_${provider}_profile`);
  return stored ? JSON.parse(stored) : null;
}

/**
 * Nettoie le profil OAuth (pour compatibilité)
 * @deprecated
 */
export function clearOAuthProfile(provider: 'github' | 'google'): void {
  sessionStorage.removeItem(`oauth_${provider}_profile`);
}

/**
 * @deprecated Utiliser initiateOAuthLogin() à la place
 * Cette fonction est conservée pour compatibilité mais redirige vers le backend
 */
export async function simulateOAuthLogin(
  provider: 'github' | 'google',
  email?: string
): Promise<OAuthProfile> {
  // En production, rediriger vers le backend
  await initiateOAuthLogin(provider);
  
  // Cette ligne ne sera jamais atteinte car initiateOAuthLogin redirige
  // Mais TypeScript nécessite un retour
  throw new Error('Redirection OAuth en cours');
}

/**
 * @deprecated
 */
export function validateOAuthToken(token: string, provider: 'github' | 'google'): boolean {
  // En production, les tokens sont validés par le backend
  return token.startsWith(`${provider}_token_`);
}

/**
 * @deprecated
 */
export function generateOAuthToken(provider: 'github' | 'google'): string {
  return `${provider}_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
