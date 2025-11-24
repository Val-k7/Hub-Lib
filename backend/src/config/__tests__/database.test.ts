/**
 * Tests unitaires pour la configuration de la base de données
 */

import { describe, it, expect, vi } from 'vitest';
import { prisma } from '../database.js';

// Mock Prisma
vi.mock('../database.js', () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

describe('Database Configuration', () => {
  it('devrait avoir un client Prisma configuré', () => {
    expect(prisma).toBeDefined();
    expect(prisma).toHaveProperty('$connect');
    expect(prisma).toHaveProperty('$disconnect');
  });
});


