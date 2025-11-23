/**
 * Simulation améliorée d'OAuth pour le mode local
 * Gère les tokens OAuth et les profils utilisateurs
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
 * Simule une connexion OAuth avec un provider
 * En production, cela redirigerait vers le provider réel
 * 
 * NOTE: En mode simulation, cette fonction génère un profil aléatoire.
 * En production, cette fonction devrait récupérer les vraies données depuis l'API du provider.
 */
export async function simulateOAuthLogin(
  provider: 'github' | 'google',
  email?: string
): Promise<OAuthProfile> {
  // Simuler un délai de connexion
  await new Promise(resolve => setTimeout(resolve, 500));

  // En mode simulation, on génère un profil
  // En production, on récupérerait les vraies données depuis l'API GitHub/Google
  
  // Si un email est fourni, l'utiliser (pour les tests ou la démo)
  // Sinon, générer un email unique basé sur le timestamp
  const profileId = `${provider}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const userEmail = email || `${provider}_user_${Date.now()}@example.com`;
  const username = userEmail.split('@')[0];

  // Valider que l'email est valide
  if (!userEmail || !userEmail.includes('@') || !userEmail.includes('.')) {
    throw new Error('Email OAuth invalide');
  }

  const profile: OAuthProfile = {
    provider,
    id: profileId,
    email: userEmail,
    name: provider === 'github' ? `GitHub User ${username}` : `Google User ${username}`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    username: provider === 'github' ? username : undefined,
  };

  // Stocker le profil OAuth dans sessionStorage pour cette session
  sessionStorage.setItem(`oauth_${provider}_profile`, JSON.stringify(profile));

  return profile;
}

/**
 * Récupère le profil OAuth depuis sessionStorage
 */
export function getOAuthProfile(provider: 'github' | 'google'): OAuthProfile | null {
  const stored = sessionStorage.getItem(`oauth_${provider}_profile`);
  return stored ? JSON.parse(stored) : null;
}

/**
 * Nettoie le profil OAuth
 */
export function clearOAuthProfile(provider: 'github' | 'google'): void {
  sessionStorage.removeItem(`oauth_${provider}_profile`);
}

/**
 * Valide un token OAuth (simulation)
 */
export function validateOAuthToken(token: string, provider: 'github' | 'google'): boolean {
  // En production, cela validerait le token avec l'API du provider
  // Pour la simulation, on vérifie juste le format
  return token.startsWith(`${provider}_token_`);
}

/**
 * Génère un token OAuth simulé
 */
export function generateOAuthToken(provider: 'github' | 'google'): string {
  return `${provider}_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

