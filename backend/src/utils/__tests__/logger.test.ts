/**
 * Tests unitaires pour le logger
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '../logger.js';

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait avoir les méthodes de logging', () => {
    expect(logger).toHaveProperty('error');
    expect(logger).toHaveProperty('warn');
    expect(logger).toHaveProperty('info');
    expect(logger).toHaveProperty('debug');
  });

  it('devrait pouvoir logger des erreurs', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    logger.error('Test error message');
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('devrait pouvoir logger des informations', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    
    logger.info('Test info message');
    
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

