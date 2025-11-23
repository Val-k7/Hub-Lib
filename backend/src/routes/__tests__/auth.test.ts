/**
 * Tests d'intégration pour les routes d'authentification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../auth.js';
import { authService } from '../../services/authService.js';

// Mock authService
vi.mock('../../services/authService.js', () => ({
  authService: {
    signup: vi.fn(),
    signin: vi.fn(),
    generateTokens: vi.fn(),
    verifyAccessToken: vi.fn(),
    getUserById: vi.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait créer un nouvel utilisateur', async () => {
    const mockUser = {
      userId: 'user-123',
      email: 'test@example.com',
    };

    vi.mocked(authService.signup).mockResolvedValue(mockUser as any);
    vi.mocked(authService.generateTokens).mockReturnValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });

    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('access_token');
    expect(response.body).toHaveProperty('refresh_token');
    expect(response.body).toHaveProperty('user');
  });

  it('devrait rejeter une requête sans email', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        password: 'password123',
      });

    expect(response.status).toBe(400);
  });

  it('devrait rejeter une requête sans mot de passe', async () => {
    const response = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'test@example.com',
      });

    expect(response.status).toBe(400);
  });
});

describe('POST /api/auth/signin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait connecter un utilisateur avec des identifiants valides', async () => {
    const mockUser = {
      userId: 'user-123',
      email: 'test@example.com',
    };

    vi.mocked(authService.signin).mockResolvedValue(mockUser as any);
    vi.mocked(authService.generateTokens).mockReturnValue({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });

    const response = await request(app)
      .post('/api/auth/signin')
      .send({
        email: 'test@example.com',
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('access_token');
    expect(response.body).toHaveProperty('user');
  });

  it('devrait rejeter des identifiants invalides', async () => {
    vi.mocked(authService.signin).mockRejectedValue(new Error('Identifiants invalides'));

    const response = await request(app)
      .post('/api/auth/signin')
      .send({
        email: 'test@example.com',
        password: 'wrongpassword',
      });

    expect(response.status).toBe(401);
  });
});

