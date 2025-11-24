import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { notificationService, type Notification } from "@/services/notificationService";
import { getErrorMessage } from "@/types/errors";

type UseNotificationsOptions = {
  enabled?: boolean;
};

export const useNotifications = (options?: UseNotificationsOptions) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      return notificationService.listNotifications();
    },
    enabled: options?.enabled ?? true,
  });

  // Subscribe to real-time notifications via WebSocket
  // TODO: Implement WebSocket subscription when websocket service is ready
  useEffect(() => {
    // Note: WebSocket subscription would be handled by the websocket service
    // For now, we rely on polling or manual refresh
  }, [queryClient, toast]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    isLoading,
    unreadCount,
  };
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await notificationService.markAsRead(notificationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: unknown) => {
      // Error handling is done by the service
      console.error("Erreur lors du marquage comme lu:", getErrorMessage(error));
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      await notificationService.markAllAsRead();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({
        title: "Notifications marquées comme lues",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Erreur",
        description: getErrorMessage(error) || "Impossible de marquer toutes les notifications comme lues",
        variant: "destructive",
      });
    },
  });
};
