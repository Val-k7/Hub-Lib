import { restApi } from "@/api/rest";

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  resourceId: string | null;
  groupId: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface CreateNotificationPayload {
  userId: string;
  type: string;
  title: string;
  message: string;
  resourceId?: string | null;
  groupId?: string | null;
}

export const notificationService = {
  async listNotifications(): Promise<Notification[]> {
    const response = await restApi.get("/api/notifications");
    return response.data?.data || response.data || [];
  },

  async markAsRead(notificationId: string): Promise<void> {
    await restApi.put(`/api/notifications/${notificationId}/read`);
  },

  async markAllAsRead(): Promise<void> {
    await restApi.put("/api/notifications/read-all");
  },

  async deleteNotification(notificationId: string): Promise<void> {
    await restApi.delete(`/api/notifications/${notificationId}`);
  },
};

