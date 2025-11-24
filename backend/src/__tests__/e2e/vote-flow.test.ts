/**
 * Tests end-to-end pour le flux de vote
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import suggestionRoutes from '../../routes/suggestions.js';
import { authMiddleware, optionalAuthMiddleware } from '../../middleware/auth.js';
import { prisma } from '../../config/database.js';
import { voteService } from '../../services/voteService.js';
import { notificationService } from '../../services/notificationService.js';

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

// Mock Prisma et services
vi.mock('../../config/database.js', () => ({
  prisma: {
    categoryTagSuggestion: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
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

vi.mock('../../services/notificationService.js', () => ({
  notificationService: {
    publishSuggestionVote: vi.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/suggestions', suggestionRoutes);

describe('Flux de vote E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait permettre de voter, changer de vote, annuler le vote et voir les résultats', async () => {
    const userId = 'test-user-123';
    const suggestionId = 'suggestion-e2e-123';

    // 1. Créer une suggestion
    const mockSuggestion = {
      id: suggestionId,
      name: 'Nouvelle catégorie',
      type: 'category',
      status: 'pending',
      createdBy: userId,
    };

    vi.mocked(prisma.categoryTagSuggestion.findUnique).mockResolvedValue(mockSuggestion as any);

    // 2. Voter (upvote)
    vi.mocked(voteService.voteOnSuggestion).mockResolvedValue({
      success: true,
      totalUpvotes: 1,
      totalDownvotes: 0,
      userVote: 'upvote',
    });

    const upvoteResponse = await request(app)
      .post(`/api/suggestions/${suggestionId}/vote`)
      .send({ voteType: 'upvote' });

    expect(upvoteResponse.status).toBe(200);
    expect(upvoteResponse.body.totalUpvotes).toBe(1);
    expect(upvoteResponse.body.userVote).toBe('upvote');

    // 3. Récupérer les votes
    vi.mocked(voteService.getSuggestionVotes).mockResolvedValue({
      totalUpvotes: 1,
      totalDownvotes: 0,
    });

    const getVotesResponse = await request(app).get(`/api/suggestions/${suggestionId}/votes`);

    expect(getVotesResponse.status).toBe(200);
    expect(getVotesResponse.body.totalUpvotes).toBe(1);

    // 4. Changer de vote (downvote)
    vi.mocked(voteService.voteOnSuggestion).mockResolvedValue({
      success: true,
      totalUpvotes: 0,
      totalDownvotes: 1,
      userVote: 'downvote',
    });

    const downvoteResponse = await request(app)
      .post(`/api/suggestions/${suggestionId}/vote`)
      .send({ voteType: 'downvote' });

    expect(downvoteResponse.status).toBe(200);
    expect(downvoteResponse.body.userVote).toBe('downvote');

    // 5. Annuler le vote
    vi.mocked(voteService.voteOnSuggestion).mockResolvedValue({
      success: true,
      totalUpvotes: 0,
      totalDownvotes: 0,
      userVote: null,
    });

    const cancelResponse = await request(app)
      .post(`/api/suggestions/${suggestionId}/vote`)
      .send({ voteType: 'downvote' });

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.userVote).toBeNull();
  });
});


