/**
 * Tests d'intégration pour voteService
 * Utilise de vraies connexions DB et Redis
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { voteService } from '../voteService.js';
import { createTestUser, deleteTestUser, type TestUser, isDatabaseAvailable, isRedisAvailable } from '../../test/helpers.js';
import { prisma } from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

describe('voteService', () => {
  let testUser: TestUser;
  let testSuggestion: { id: string };

  beforeEach(async () => {
    if (!(await isDatabaseAvailable()) || !(await isRedisAvailable())) {
      return;
    }
    testUser = await createTestUser();

    // Créer une suggestion de test
    testSuggestion = await prisma.categoryTagSuggestion.create({
      data: {
        type: 'category',
        value: `Test Category ${uuidv4()}`,
        status: 'pending',
        suggestedBy: testUser.userId,
      },
    });
  });

  afterEach(async () => {
    if (testSuggestion?.id) {
      await prisma.suggestionVote.deleteMany({
        where: { suggestionId: testSuggestion.id },
      });
      await prisma.categoryTagSuggestion.delete({
        where: { id: testSuggestion.id },
      });
    }
    if (testUser?.userId) {
      await deleteTestUser(testUser.userId);
    }
  });

  describe('voteOnSuggestion', () => {
    it('devrait créer un nouveau vote', async () => {
      if (!(await isDatabaseAvailable()) || !(await isRedisAvailable())) {
        return;
      }

      const result = await voteService.voteOnSuggestion(
        testSuggestion.id,
        testUser.userId,
        'upvote'
      );

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('totalUpvotes');
      expect(result).toHaveProperty('totalDownvotes');
      expect(result).toHaveProperty('userVote', 'upvote');
    });

    it('devrait annuler un vote si l\'utilisateur vote de la même manière', async () => {
      if (!(await isDatabaseAvailable()) || !(await isRedisAvailable())) {
        return;
      }

      // Créer un vote upvote
      await voteService.voteOnSuggestion(testSuggestion.id, testUser.userId, 'upvote');

      // Voter à nouveau upvote (devrait annuler)
      const result = await voteService.voteOnSuggestion(
        testSuggestion.id,
        testUser.userId,
        'upvote'
      );

      expect(result.success).toBe(true);
      expect(result.userVote).toBeNull();
    });

    it('devrait changer un vote upvote en downvote', async () => {
      if (!(await isDatabaseAvailable()) || !(await isRedisAvailable())) {
        return;
      }

      // Créer un vote upvote
      await voteService.voteOnSuggestion(testSuggestion.id, testUser.userId, 'upvote');

      // Changer en downvote
      const result = await voteService.voteOnSuggestion(
        testSuggestion.id,
        testUser.userId,
        'downvote'
      );

      expect(result.success).toBe(true);
      expect(result.userVote).toBe('downvote');
    });
  });

  describe('getSuggestionVotes', () => {
    it('devrait récupérer les votes d\'une suggestion', async () => {
      if (!(await isDatabaseAvailable()) || !(await isRedisAvailable())) {
        return;
      }

      // Créer quelques votes
      const user2 = await createTestUser();
      await voteService.voteOnSuggestion(testSuggestion.id, testUser.userId, 'upvote');
      await voteService.voteOnSuggestion(testSuggestion.id, user2.userId, 'upvote');

      const votes = await voteService.getSuggestionVotes(testSuggestion.id);

      expect(votes).toHaveProperty('totalUpvotes');
      expect(votes).toHaveProperty('totalDownvotes');
      expect(votes.totalUpvotes).toBeGreaterThanOrEqual(2);

      // Nettoyer
      await deleteTestUser(user2.userId);
    });
  });
});
