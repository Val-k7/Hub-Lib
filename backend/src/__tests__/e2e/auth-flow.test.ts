/**
 * Tests end-to-end pour le flux d'authentification complet
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../../routes/auth.js';
import { prisma } from '../../config/database.js';
import { authService } from '../../services/authService.js';
import { sessionService } from '../../services/sessionService.js';
import bcrypt from 'bcryptjs';

// Mock Prisma et services
vi.mock('../../config/database.js', () => ({
  prisma: {
    profile: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    userRole: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../services/authService.js', () => ({
  authService: {
    signup: vi.fn(),
    signin: vi.fn(),
    generateTokens: vi.fn(),
    verifyAccessToken: vi.fn(),
    getUserById: vi.fn(),
  },
}));

vi.mock('../../services/sessionService.js', () => ({
  sessionService: {
    createSession: vi.fn(),
    validateSession: vi.fn(),
    deleteSession: vi.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Flux d\'authentification E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait permettre l\'inscription, la connexion et la déconnexion', async () => {
    const email = 'e2e-test@example.com';
    const password = 'password123';
    const userId = 'e2e-user-123';

    // 1. Inscription
    const mockUser = {
      userId,
      email,
      username: 'e2etest',
    };

    vi.mocked(authService.signup).mockResolvedValue(mockUser as any);
    vi.mocked(authService.generateTokens).mockReturnValue({
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
      expiresIn: 7 * 24 * 60 * 60,
    });
    vi.mocked(sessionService.createSession).mockResolvedValue();

    const signupResponse = await request(app)
      .post('/api/auth/signup')
      .send({ email, password });

    expect(signupResponse.status).toBe(201);
    expect(signupResponse.body).toHaveProperty('access_token');
    expect(signupResponse.body).toHaveProperty('refresh_token');
    expect(signupResponse.body).toHaveProperty('user');

    // 2. Connexion
    vi.mocked(authService.signin).mockResolvedValue(mockUser as any);
    vi.mocked(authService.generateTokens).mockReturnValue({
      accessToken: 'access-token-456',
      refreshToken: 'refresh-token-456',
      expiresIn: 7 * 24 * 60 * 60,
    });

    const signinResponse = await request(app)
      .post('/api/auth/signin')
      .send({ email, password });

    expect(signinResponse.status).toBe(200);
    expect(signinResponse.body).toHaveProperty('access_token');

    // 3. Déconnexion
    vi.mocked(authService.verifyAccessToken).mockReturnValue({
      userId,
      email,
    });
    vi.mocked(sessionService.deleteSession).mockResolvedValue();

    const signoutResponse = await request(app)
      .post('/api/auth/signout')
      .set('Authorization', 'Bearer access-token-456');

    expect(signoutResponse.status).toBe(200);
  });

  it('devrait permettre le rafraîchissement de token', async () => {
    const userId = 'user-123';
    const refreshToken = 'refresh-token-123';

    vi.mocked(authService.verifyRefreshToken).mockReturnValue({
      userId,
      email: 'test@example.com',
    });
    vi.mocked(sessionService.validateSession).mockResolvedValue(true);
    vi.mocked(authService.getUserById).mockResolvedValue({
      userId,
      email: 'test@example.com',
    } as any);
    vi.mocked(authService.generateTokens).mockReturnValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 7 * 24 * 60 * 60,
    });
    vi.mocked(sessionService.updateSession).mockResolvedValue();

    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: refreshToken });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('access_token');
  });
});


