import { describe, it, expect } from 'vitest';
import { 
  hashPassword, 
  verifyPassword, 
  generateSalt, 
  validatePasswordStrength,
  generateAuthToken 
} from '../auth';

describe('Auth Utilities', () => {
  describe('generateSalt', () => {
    it('should generate a unique salt each time', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(salt1).not.toBe(salt2);
      expect(salt1.length).toBeGreaterThan(0);
    });
  });

  describe('hashPassword', () => {
    it('should hash a password with a salt', () => {
      const salt = generateSalt();
      const hash = hashPassword('testpassword', salt);
      expect(hash).toBeTruthy();
      expect(hash).not.toBe('testpassword');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for different salts', () => {
      const password = 'testpassword';
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      const hash1 = hashPassword(password, salt1);
      const hash2 = hashPassword(password, salt2);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify a correct password', () => {
      const password = 'testpassword123';
      const salt = generateSalt();
      const hash = hashPassword(password, salt);
      expect(verifyPassword(password, hash, salt)).toBe(true);
    });

    it('should reject an incorrect password', () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const salt = generateSalt();
      const hash = hashPassword(password, salt);
      expect(verifyPassword(wrongPassword, hash, salt)).toBe(false);
    });
  });

  describe('validatePasswordStrength', () => {
    it('should accept a strong password', () => {
      const result = validatePasswordStrength('StrongPass123!');
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject a weak password', () => {
      const result = validatePasswordStrength('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should check for minimum length', () => {
      const result = validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('8 caractères'))).toBe(true);
    });

    it('should check for uppercase', () => {
      const result = validatePasswordStrength('nouppercase123!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('majuscule'))).toBe(true);
    });

    it('should check for lowercase', () => {
      const result = validatePasswordStrength('NOLOWERCASE123!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('minuscule'))).toBe(true);
    });

    it('should check for numbers', () => {
      const result = validatePasswordStrength('NoNumbers!');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('chiffre'))).toBe(true);
    });

    it('should check for special characters', () => {
      const result = validatePasswordStrength('NoSpecial123');
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('spécial'))).toBe(true);
    });
  });

  describe('generateAuthToken', () => {
    it('should generate a unique token each time', () => {
      const token1 = generateAuthToken();
      const token2 = generateAuthToken();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(0);
    });
  });
});


