/**
 * Tests d'intégration pour les routes de notifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import notificationRoutes from '../notifications.js';
import { authMiddleware } from '../../middleware/auth.js';
import { prisma } from '../../config/database.js';

// Mock authMiddleware
vi.mock('../../middleware/auth.js', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-123', email: 'test@example.com' };
    next();
  },
}));

// Mock Prisma
vi.mock('../../config/database.js', () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use('/api/notifications', notificationRoutes);

describe('GET /api/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait récupérer les notifications de l\'utilisateur', async () => {
    const mockNotifications = [
      {
        id: 'notif-1',
        userId: 'test-user-123',
        type: 'test',
        title: 'Test',
        message: 'Message test',
        isRead: false,
      },
    ];

    vi.mocked(prisma.notification.findMany).mockResolvedValue(mockNotifications as any);
    vi.mocked(prisma.notification.count).mockResolvedValue(1);

    const response = await request(app).get('/api/notifications');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('devrait filtrer les notifications non lues', async () => {
    vi.mocked(prisma.notification.findMany).mockResolvedValue([]);
    vi.mocked(prisma.notification.count).mockResolvedValue(0);

    const response = await request(app).get('/api/notifications?unread=true');

    expect(response.status).toBe(200);
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isRead: false,
        }),
      })
    );
  });
});

describe('PUT /api/notifications/:id/read', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait marquer une notification comme lue', async () => {
    const notificationId = 'notif-123';

    vi.mocked(prisma.notification.findUnique).mockResolvedValue({
      id: notificationId,
      userId: 'test-user-123',
    } as any);
    vi.mocked(prisma.notification.update).mockResolvedValue({
      id: notificationId,
      isRead: true,
    } as any);

    const response = await request(app).put(`/api/notifications/${notificationId}/read`);

    expect(response.status).toBe(200);
    expect(response.body.data.isRead).toBe(true);
  });
});

describe('PUT /api/notifications/read-all', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait marquer toutes les notifications comme lues', async () => {
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 5 });

    const response = await request(app).put('/api/notifications/read-all');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('count');
    expect(prisma.notification.updateMany).toHaveBeenCalled();
  });
});

