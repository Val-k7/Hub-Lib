import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { BellRing, CheckCircle2, Inbox, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from "@/hooks/useNotifications";
import { type Notification } from "@/services/notificationService";
import { useAuth } from "@/hooks/useAuth";

interface NotificationsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  open,
  onOpenChange,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const { notifications, isLoading, unreadCount } = useNotifications({
    enabled: Boolean(user) && open,
  });

  const hasNotifications = notifications.length > 0;
  const unreadLabel =
    unreadCount === 0
      ? "Aucune notification non lue"
      : unreadCount === 1
        ? "1 notification non lue"
        : `${unreadCount} notifications non lues`;

  const handleMarkAll = () => {
    if (unreadCount === 0) return;
    markAllAsRead.mutate();
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead.mutate(notificationId);
  };

  const handleNavigate = (notification: Notification) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification.id);
    }

    if (notification.resourceId) {
      navigate(`/resource/${notification.resourceId}`);
      onOpenChange(false);
      return;
    }

    if (notification.groupId) {
      navigate(`/groups?focus=${notification.groupId}`);
      onOpenChange(false);
      return;
    }

    if (notification.type === "suggestion") {
      navigate("/suggestions");
      onOpenChange(false);
    }
  };

  const renderNotification = (notification: Notification) => {
    const createdAtLabel = formatDistanceToNow(new Date(notification.createdAt), {
      addSuffix: true,
      locale: fr,
    });

    const hasAction =
      Boolean(notification.resourceId) ||
      Boolean(notification.groupId) ||
      notification.type === "suggestion";

    return (
      <div
        key={notification.id}
        className={`rounded-xl border p-4 space-y-3 ${
          notification.isRead ? "bg-card" : "bg-primary/5 border-primary/40"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-semibold leading-tight">{notification.title}</p>
            <p className="text-sm text-muted-foreground">{notification.message}</p>
          </div>
          {!notification.isRead && (
            <Badge variant="default" className="shrink-0">
              Nouveau
            </Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{createdAtLabel}</span>
          <div className="flex items-center gap-2">
            {!notification.isRead && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMarkAsRead(notification.id)}
                className="h-8 gap-1"
                disabled={markAsRead.isPending}
              >
                <CheckCircle2 className="h-4 w-4" />
                Marquer comme lu
              </Button>
            )}
            {hasAction && (
              <Button
                variant="secondary"
                size="sm"
                className="h-8 gap-1"
                onClick={() => handleNavigate(notification)}
              >
                Voir
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[420px] flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            Notifications
          </SheetTitle>
          <SheetDescription>
            Consultez les dernières activités liées à vos ressources, partages et suggestions.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between">
          <Badge variant="secondary">{unreadLabel}</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAll}
            disabled={markAllAsRead.isPending || unreadCount === 0}
            className="gap-2"
          >
            {markAllAsRead.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Tout marquer comme lu
          </Button>
        </div>

        <ScrollArea className="flex-1 pr-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mb-3" />
              Chargement des notifications...
            </div>
          ) : !hasNotifications ? (
            <div className="flex flex-col items-center justify-center text-center py-16 space-y-3 text-muted-foreground">
              <Inbox className="h-10 w-10" />
              <div>
                <p className="font-medium text-foreground">Aucune notification</p>
                <p className="text-sm">
                  Vous serez averti dès qu'une activité concernant vos ressources ou suggestions aura lieu.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pb-6">{notifications.map(renderNotification)}</div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

