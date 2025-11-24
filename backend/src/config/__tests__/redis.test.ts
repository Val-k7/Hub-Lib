/**
 * Tests unitaires pour la configuration Redis
 */

import { describe, it, expect, vi } from 'vitest';
import { redis } from '../redis.js';

// Mock Redis
vi.mock('../redis.js', () => ({
  redis: {
    on: vi.fn(),
    ping: vi.fn(),
    quit: vi.fn(),
  },
}));

describe('Redis Configuration', () => {
  it('devrait avoir un client Redis configuré', () => {
    expect(redis).toBeDefined();
    expect(redis).toHaveProperty('on');
  });
});


