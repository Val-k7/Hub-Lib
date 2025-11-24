/**
 * Utilitaires pour gérer le Service Worker
 */

import { logger } from './logger';

/**
 * Enregistrer le Service Worker
 */
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      // Vérifier les mises à jour
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nouvelle version disponible
              logger.info('Nouvelle version du Service Worker disponible');
              // On pourrait afficher une notification à l'utilisateur
            }
          });
        }
      });

      // Vérifier les mises à jour périodiquement
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Toutes les heures

      logger.info('Service Worker enregistré avec succès');
      return registration;
    } catch (error) {
      logger.error('Erreur lors de l\'enregistrement du Service Worker', error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  } else {
    logger.warn('Service Workers non supportés par ce navigateur');
    return null;
  }
}

/**
 * Désenregistrer le Service Worker (utile pour le développement)
 */
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.unregister();
      logger.info('Service Worker désenregistré');
    } catch (error) {
      logger.error('Erreur lors du désenregistrement', error instanceof Error ? error : new Error(String(error)));
    }
  }
}

/**
 * Vérifier si le Service Worker est actif
 */
export async function isServiceWorkerActive(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      return !!registration.active;
    } catch {
      return false;
    }
  }
  return false;
}


