import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { localClient } from "@/integrations/local/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  resource_id: string | null;
  group_id: string | null;
  is_read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: { user } } = await localClient.auth.getUser();
      if (!user) return [];

      const { data, error } = await localClient
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)
        .execute();

      if (error) throw error;
      return data as Notification[];
    },
  });

  // Subscribe to real-time notifications
  useEffect(() => {
    const channel = localClient
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload: any) => {
          const newNotification = payload.new as Notification;
          
          // Show toast notification
          toast({
            title: newNotification.title,
            description: newNotification.message,
          });

          // Update query cache
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();

    return () => {
      if (channel && channel.unsubscribe) {
        channel.unsubscribe();
      }
    };
  }, [queryClient, toast]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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
      const { error } = await localClient
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { error } = await localClient
        .from("notifications")
        .update({ is_read: true })
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({
        title: "Notifications marquées comme lues",
      });
    },
  });
};
