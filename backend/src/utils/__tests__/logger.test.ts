/**
 * Tests unitaires pour le logger
 */

import { describe, it, expect } from 'vitest';
import { logger } from '../logger.js';

describe('logger', () => {
  it('devrait avoir les méthodes de logging', () => {
    expect(logger).toHaveProperty('error');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('debug');
  });

  it('devrait pouvoir logger des erreurs', () => {
    // Winston logger ne log pas directement vers console
    // On vérifie juste que la méthode existe et ne plante pas
    expect(() => {
      logger.error('Test error message');
    }).not.toThrow();
  });

  it('devrait pouvoir logger des informations', () => {
    // Winston logger ne log pas directement vers console
    // On vérifie juste que la méthode existe et ne plante pas
    expect(() => {
      logger.info('Test info message');
    }).not.toThrow();
  });
});
