import { describe, it, expect, beforeEach, vi } from 'vitest';
import { logger, LogLevel } from '../logger';

describe('Logger', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear console methods
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('debug', () => {
    it('should log debug messages in development', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      logger.debug('Test debug message', { key: 'value' });
      
      // In development mode, debug should log
      if (import.meta.env.DEV) {
        expect(consoleSpy).toHaveBeenCalled();
      }
    });
  });

  describe('info', () => {
    it('should log info messages', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      logger.info('Test info message');
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('warn', () => {
    it('should log warning messages', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      logger.warn('Test warning message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should log warnings with context', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      logger.warn('Test warning', { context: 'test' });
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      const consoleSpy = vi.spyOn(console, 'error');
      const error = new Error('Test error');
      logger.error('Test error message', error);
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should store errors in localStorage', () => {
      const error = new Error('Test error');
      logger.error('Test error message', error);
      
      const storedErrors = logger.getStoredErrors();
      expect(storedErrors.length).toBeGreaterThan(0);
      expect(storedErrors[0].level).toBe(LogLevel.ERROR);
      expect(storedErrors[0].message).toBe('Test error message');
    });

    it('should limit stored errors to 50', () => {
      // Generate 60 errors
      for (let i = 0; i < 60; i++) {
        logger.error(`Error ${i}`, new Error(`Error ${i}`));
      }

      const storedErrors = logger.getStoredErrors();
      expect(storedErrors.length).toBeLessThanOrEqual(50);
    });
  });

  describe('getStoredErrors', () => {
    it('should return empty array when no errors stored', () => {
      localStorage.clear();
      const errors = logger.getStoredErrors();
      expect(errors).toEqual([]);
    });

    it('should return stored errors', () => {
      const error = new Error('Test error');
      logger.error('Test error message', error);
      
      const errors = logger.getStoredErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('Test error message');
    });
  });

  describe('clearStoredErrors', () => {
    it('should clear stored errors', () => {
      logger.error('Test error', new Error('Test'));
      expect(logger.getStoredErrors().length).toBeGreaterThan(0);
      
      logger.clearStoredErrors();
      expect(logger.getStoredErrors().length).toBe(0);
    });
  });
});

