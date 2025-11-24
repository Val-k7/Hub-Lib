/**
 * Tests d'intégration pour les routes de suggestions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import suggestionRoutes from '../suggestions.js';
import { authMiddleware, optionalAuthMiddleware } from '../../middleware/auth.js';
import { prisma } from '../../config/database.js';
import { voteService } from '../../services/voteService.js';

// Mock authMiddleware
vi.mock('../../middleware/auth.js', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-123', email: 'test@example.com' };
    next();
  },
  optionalAuthMiddleware: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-123', email: 'test@example.com' };
    next();
  },
}));

// Mock Prisma et voteService
vi.mock('../../config/database.js', () => ({
  prisma: {
    categoryTagSuggestion: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../services/voteService.js', () => ({
  voteService: {
    voteOnSuggestion: vi.fn(),
    getSuggestionVotes: vi.fn(),
    getUserVote: vi.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/suggestions', suggestionRoutes);

describe('GET /api/suggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait récupérer la liste des suggestions', async () => {
    const mockSuggestions = [
      {
        id: 'suggestion-1',
        name: 'Nouvelle catégorie',
        type: 'category',
        status: 'pending',
      },
    ];

    vi.mocked(prisma.categoryTagSuggestion.findMany).mockResolvedValue(mockSuggestions as any);

    const response = await request(app).get('/api/suggestions');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
  });
});

describe('POST /api/suggestions/:id/vote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait voter sur une suggestion', async () => {
    const suggestionId = 'suggestion-123';
    const voteData = {
      voteType: 'upvote',
    };

    vi.mocked(voteService.voteOnSuggestion).mockResolvedValue({
      success: true,
      totalUpvotes: 5,
      totalDownvotes: 2,
      userVote: 'upvote',
    });

    const response = await request(app)
      .post(`/api/suggestions/${suggestionId}/vote`)
      .send(voteData);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('totalUpvotes');
    expect(voteService.voteOnSuggestion).toHaveBeenCalledWith(
      suggestionId,
      'test-user-123',
      'upvote'
    );
  });
});


