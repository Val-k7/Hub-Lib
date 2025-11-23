/**
 * Service de gestion des notifications
 * Crée et gère les notifications pour les utilisateurs
 */

import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { redis } from '../config/redis.js';

export interface NotificationData {
  userId: string;
  type: string;
  title: string;
  message: string;
  resourceId?: string;
  groupId?: string;
}

class NotificationService {
  /**
   * Crée une notification
   */
  async createNotification(data: NotificationData): Promise<void> {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          resourceId: data.resourceId || null,
          groupId: data.groupId || null,
          isRead: false,
        },
      });

      // Publier la notification via Redis Pub/Sub pour temps réel
      await this.publishNotification(data.userId, notification);

      logger.debug(`Notification créée pour l'utilisateur ${data.userId}: ${data.type}`);
    } catch (error: any) {
      logger.error(`Erreur lors de la création de la notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Crée plusieurs notifications (pour un groupe par exemple)
   */
  async createBulkNotifications(userIds: string[], data: Omit<NotificationData, 'userId'>): Promise<void> {
    try {
      const notifications = userIds.map((userId) => ({
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        resourceId: data.resourceId || null,
        groupId: data.groupId || null,
        isRead: false,
      }));

      // Créer en batch
      await prisma.notification.createMany({
        data: notifications,
      });

      // Publier pour chaque utilisateur
      for (const userId of userIds) {
        const notification = await prisma.notification.findFirst({
          where: {
            userId,
            type: data.type,
            resourceId: data.resourceId || null,
            groupId: data.groupId || null,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (notification) {
          await this.publishNotification(userId, notification);
        }
      }

      logger.debug(`${notifications.length} notifications créées en bulk`);
    } catch (error: any) {
      logger.error(`Erreur lors de la création en bulk: ${error.message}`);
      throw error;
    }
  }

  /**
   * Publie une notification via Redis Pub/Sub
   */
  private async publishNotification(userId: string, notification: any): Promise<void> {
    try {
      const channel = `notifications:${userId}`;
      await redis.publish(channel, JSON.stringify(notification));
      logger.debug(`Notification publiée sur le canal ${channel}`);
    } catch (error: any) {
      logger.error(`Erreur lors de la publication de la notification: ${error.message}`);
      // Ne pas faire échouer la création de la notification si la publication échoue
    }
  }

  /**
   * Publie une mise à jour de ressource via Redis Pub/Sub
   */
  async publishResourceUpdate(resourceId: string, update: any): Promise<void> {
    try {
      const channel = `resource:updates:${resourceId}`;
      await redis.publish(channel, JSON.stringify({
        resourceId,
        update,
        timestamp: new Date().toISOString(),
      }));
      logger.debug(`Mise à jour de ressource publiée sur le canal ${channel}`);
    } catch (error: any) {
      logger.error(`Erreur lors de la publication de la mise à jour de ressource: ${error.message}`);
    }
  }

  /**
   * Publie une mise à jour de vote sur suggestion via Redis Pub/Sub
   */
  async publishSuggestionVote(suggestionId: string, voteData: {
    userId: string;
    voteType: 'upvote' | 'downvote';
    totalUpvotes: number;
    totalDownvotes: number;
  }): Promise<void> {
    try {
      const channel = `suggestions:votes`;
      await redis.publish(channel, JSON.stringify({
        suggestionId,
        ...voteData,
        timestamp: new Date().toISOString(),
      }));
      logger.debug(`Vote sur suggestion publié sur le canal ${channel}`);
    } catch (error: any) {
      logger.error(`Erreur lors de la publication du vote: ${error.message}`);
    }
  }

  /**
   * Crée une notification de partage de ressource
   */
  async notifyResourceShare(recipientId: string, resourceId: string, sharerId: string): Promise<void> {
    // Récupérer les infos de la ressource et du partageur
    const [resource, sharer] = await Promise.all([
      prisma.resource.findUnique({
        where: { id: resourceId },
        select: { title: true },
      }),
      prisma.profile.findUnique({
        where: { userId: sharerId },
        select: { username: true, fullName: true },
      }),
    ]);

    if (!resource || !sharer) {
      return;
    }

    await this.createNotification({
      userId: recipientId,
      type: 'resource_shared',
      title: 'Ressource partagée',
      message: `${sharer.fullName || sharer.username} a partagé la ressource "${resource.title}" avec vous`,
      resourceId,
    });
  }

  /**
   * Crée une notification de nouveau commentaire
   */
  async notifyNewComment(resourceId: string, commenterId: string, resourceOwnerId: string): Promise<void> {
    // Ne pas notifier si l'auteur du commentaire est le propriétaire
    if (commenterId === resourceOwnerId) {
      return;
    }

    const [resource, commenter] = await Promise.all([
      prisma.resource.findUnique({
        where: { id: resourceId },
        select: { title: true },
      }),
      prisma.profile.findUnique({
        where: { userId: commenterId },
        select: { username: true, fullName: true },
      }),
    ]);

    if (!resource || !commenter) {
      return;
    }

    await this.createNotification({
      userId: resourceOwnerId,
      type: 'new_comment',
      title: 'Nouveau commentaire',
      message: `${commenter.fullName || commenter.username} a commenté votre ressource "${resource.title}"`,
      resourceId,
    });
  }

  /**
   * Crée une notification d'ajout à un groupe
   */
  async notifyGroupInvitation(userId: string, groupId: string, inviterId: string): Promise<void> {
    const [group, inviter] = await Promise.all([
      prisma.group.findUnique({
        where: { id: groupId },
        select: { name: true },
      }),
      prisma.profile.findUnique({
        where: { userId: inviterId },
        select: { username: true, fullName: true },
      }),
    ]);

    if (!group || !inviter) {
      return;
    }

    await this.createNotification({
      userId,
      type: 'group_invitation',
      title: 'Invitation à un groupe',
      message: `${inviter.fullName || inviter.username} vous a ajouté au groupe "${group.name}"`,
      groupId,
    });
  }
}

export const notificationService = new NotificationService();

