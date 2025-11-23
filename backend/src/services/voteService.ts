/**
 * Service de gestion des votes en temps réel avec Redis
 * Synchronise les votes sur les suggestions entre utilisateurs
 */

import { redis } from '../config/redis.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { notificationService } from './notificationService.js';
import { queueService, JobType } from './queueService.js';

class VoteService {
  private readonly VOTE_PREFIX = 'vote:';
  private readonly SUGGESTION_PREFIX = 'suggestion:';

  /**
   * Vote sur une suggestion
   */
  async voteOnSuggestion(
    suggestionId: string,
    userId: string,
    voteType: 'upvote' | 'downvote'
  ): Promise<{
    success: boolean;
    totalUpvotes: number;
    totalDownvotes: number;
    userVote: 'upvote' | 'downvote' | null;
  }> {
    try {
      // Vérifier si la suggestion existe
      const suggestion = await prisma.categoryTagSuggestion.findUnique({
        where: { id: suggestionId },
      });

      if (!suggestion) {
        throw new Error(`Suggestion ${suggestionId} introuvable`);
      }

      // Vérifier le vote actuel de l'utilisateur
      const existingVote = await prisma.suggestionVote.findUnique({
        where: {
          suggestionId_userId: {
            suggestionId,
            userId,
          },
        },
      });

      let userVote: 'upvote' | 'downvote' | null = null;

      if (existingVote) {
        // Si l'utilisateur vote de la même manière, annuler le vote
        if (existingVote.voteType === voteType) {
          await prisma.suggestionVote.delete({
            where: {
              suggestionId_userId: {
                suggestionId,
                userId,
              },
            },
          });
          userVote = null;
        } else {
          // Sinon, changer le vote
          await prisma.suggestionVote.update({
            where: {
              suggestionId_userId: {
                suggestionId,
                userId,
              },
            },
            data: { voteType },
          });
          userVote = voteType;
        }
      } else {
        // Nouveau vote
        await prisma.suggestionVote.create({
          data: {
            suggestionId,
            userId,
            voteType,
          },
        });
        userVote = voteType;
      }

      // Récupérer les totaux
      const [totalUpvotes, totalDownvotes] = await Promise.all([
        prisma.suggestionVote.count({
          where: {
            suggestionId,
            voteType: 'upvote',
          },
        }),
        prisma.suggestionVote.count({
          where: {
            suggestionId,
            voteType: 'downvote',
          },
        }),
      ]);

      // Mettre à jour le cache Redis
      await this.updateSuggestionCache(suggestionId, totalUpvotes, totalDownvotes);

      // Publier la mise à jour via Pub/Sub
      await notificationService.publishSuggestionVote(suggestionId, {
        userId,
        voteType: userVote || voteType,
        totalUpvotes,
        totalDownvotes,
      });

      // Si le seuil d'approbation automatique est atteint, ajouter une tâche
      const threshold = 10; // Seuil par défaut
      if (totalUpvotes >= threshold && suggestion.status === 'pending') {
        await queueService.addJob(JobType.AUTO_APPROVAL, {
          suggestionId,
          threshold,
        });
      }

      return {
        success: true,
        totalUpvotes,
        totalDownvotes,
        userVote,
      };
    } catch (error: any) {
      logger.error(`Erreur lors du vote sur la suggestion: ${error.message}`);
      throw error;
    }
  }

  /**
   * Récupère les votes d'une suggestion depuis le cache ou la DB
   */
  async getSuggestionVotes(suggestionId: string): Promise<{
    totalUpvotes: number;
    totalDownvotes: number;
  }> {
    try {
      // Essayer de récupérer depuis le cache
      const cacheKey = `${this.SUGGESTION_PREFIX}${suggestionId}:votes`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // Sinon, récupérer depuis la DB
      const [totalUpvotes, totalDownvotes] = await Promise.all([
        prisma.suggestionVote.count({
          where: {
            suggestionId,
            voteType: 'upvote',
          },
        }),
        prisma.suggestionVote.count({
          where: {
            suggestionId,
            voteType: 'downvote',
          },
        }),
      ]);

      const result = { totalUpvotes, totalDownvotes };

      // Mettre en cache
      await redis.setex(cacheKey, 300, JSON.stringify(result)); // TTL: 5 minutes

      return result;
    } catch (error: any) {
      logger.error(`Erreur lors de la récupération des votes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Récupère le vote d'un utilisateur sur une suggestion
   */
  async getUserVote(suggestionId: string, userId: string): Promise<'upvote' | 'downvote' | null> {
    try {
      const vote = await prisma.suggestionVote.findUnique({
        where: {
          suggestionId_userId: {
            suggestionId,
            userId,
          },
        },
      });

      return vote?.voteType || null;
    } catch (error: any) {
      logger.error(`Erreur lors de la récupération du vote utilisateur: ${error.message}`);
      return null;
    }
  }

  /**
   * Met à jour le cache Redis pour une suggestion
   */
  private async updateSuggestionCache(
    suggestionId: string,
    totalUpvotes: number,
    totalDownvotes: number
  ): Promise<void> {
    try {
      const cacheKey = `${this.SUGGESTION_PREFIX}${suggestionId}:votes`;
      await redis.setex(
        cacheKey,
        300, // TTL: 5 minutes
        JSON.stringify({ totalUpvotes, totalDownvotes })
      );
    } catch (error: any) {
      logger.error(`Erreur lors de la mise à jour du cache: ${error.message}`);
    }
  }

  /**
   * Invalide le cache d'une suggestion
   */
  async invalidateSuggestionCache(suggestionId: string): Promise<void> {
    try {
      const cacheKey = `${this.SUGGESTION_PREFIX}${suggestionId}:votes`;
      await redis.del(cacheKey);
    } catch (error: any) {
      logger.error(`Erreur lors de l'invalidation du cache: ${error.message}`);
    }
  }

  /**
   * Récupère les suggestions les plus votées (depuis le cache)
   */
  async getTopVotedSuggestions(limit: number = 10): Promise<string[]> {
    try {
      // Utiliser Redis Sorted Set pour stocker les scores
      const key = 'suggestions:top:voted';
      const suggestionIds = await redis.zrevrange(key, 0, limit - 1);

      return suggestionIds;
    } catch (error: any) {
      logger.error(`Erreur lors de la récupération des suggestions populaires: ${error.message}`);
      return [];
    }
  }

  /**
   * Met à jour le score d'une suggestion dans le sorted set
   */
  async updateSuggestionScore(suggestionId: string, score: number): Promise<void> {
    try {
      const key = 'suggestions:top:voted';
      await redis.zadd(key, score, suggestionId);
      // Garder seulement les top 100
      await redis.zremrangebyrank(key, 0, -101);
    } catch (error: any) {
      logger.error(`Erreur lors de la mise à jour du score: ${error.message}`);
    }
  }
}

export const voteService = new VoteService();


