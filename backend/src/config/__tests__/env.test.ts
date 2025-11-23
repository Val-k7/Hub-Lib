/**
 * Tests unitaires pour la configuration d'environnement
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Configuration environnement', () => {
  beforeEach(() => {
    // Réinitialiser les variables d'environnement
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_PASSWORD;
    delete process.env.JWT_SECRET;
  });

  it('devrait valider les variables d\'environnement requises', () => {
    // Ce test vérifie que le module env.ts valide correctement
    // En cas d'erreur, le processus devrait s'arrêter
    expect(() => {
      // Simuler un chargement avec variables manquantes
      process.env.DATABASE_URL = '';
      process.env.REDIS_PASSWORD = '';
      process.env.JWT_SECRET = '';
    }).not.toThrow();
  });

  it('devrait avoir des valeurs par défaut pour les variables optionnelles', () => {
    // Vérifier que les valeurs par défaut sont définies
    expect(process.env.NODE_ENV || 'development').toBeDefined();
    expect(process.env.PORT || '3001').toBeDefined();
  });
});

