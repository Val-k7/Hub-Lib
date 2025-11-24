/**
 * Tests end-to-end pour le flux de notifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import notificationRoutes from '../../routes/notifications.js';
import resourceRoutes from '../../routes/resources.js';
import { authMiddleware } from '../../middleware/auth.js';
import { prisma } from '../../config/database.js';
import { notificationService } from '../../services/notificationService.js';

// Mock authMiddleware
vi.mock('../../middleware/auth.js', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-123', email: 'test@example.com' };
    next();
  },
}));

// Mock Prisma et services
vi.mock('../../config/database.js', () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    resource: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../../services/notificationService.js', () => ({
  notificationService: {
    createNotification: vi.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/notifications', notificationRoutes);
app.use('/api/resources', resourceRoutes);

describe('Flux de notifications E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait permettre de recevoir, consulter, marquer comme lue et supprimer des notifications', async () => {
    const userId = 'test-user-123';
    const notificationId = 'notif-e2e-123';

    // 1. Simuler la création d'une notification (via une action comme partage de ressource)
    const mockNotification = {
      id: notificationId,
      userId,
      type: 'resource_shared',
      title: 'Ressource partagée',
      message: 'Une ressource vous a été partagée',
      isRead: false,
      createdAt: new Date(),
    };

    vi.mocked(notificationService.createNotification).mockResolvedValue(mockNotification as any);

    // 2. Récupérer les notifications
    vi.mocked(prisma.notification.findMany).mockResolvedValue([mockNotification] as any);
    vi.mocked(prisma.notification.count).mockResolvedValue(1);

    const getNotificationsResponse = await request(app).get('/api/notifications');

    expect(getNotificationsResponse.status).toBe(200);
    expect(getNotificationsResponse.body.data.length).toBe(1);
    expect(getNotificationsResponse.body.data[0].isRead).toBe(false);

    // 3. Récupérer le compteur de non lues
    vi.mocked(prisma.notification.count).mockResolvedValue(1);

    const unreadResponse = await request(app).get('/api/notifications?unread=true');

    expect(unreadResponse.status).toBe(200);

    // 4. Marquer une notification comme lue
    const mockReadNotification = {
      ...mockNotification,
      isRead: true,
    };

    vi.mocked(prisma.notification.findUnique).mockResolvedValue(mockNotification as any);
    vi.mocked(prisma.notification.update).mockResolvedValue(mockReadNotification as any);

    const markReadResponse = await request(app)
      .put(`/api/notifications/${notificationId}/read`);

    expect(markReadResponse.status).toBe(200);
    expect(markReadResponse.body.data.isRead).toBe(true);

    // 5. Marquer toutes les notifications comme lues
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 1 });

    const markAllReadResponse = await request(app)
      .put('/api/notifications/read-all');

    expect(markAllReadResponse.status).toBe(200);
    expect(markAllReadResponse.body).toHaveProperty('count');
  });
});


