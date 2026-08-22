import { Avatar, AvatarFallback, AvatarImage } from "@flaner/ui-components";
import { formatDistanceToNow } from "date-fns";
import { pl, enUS } from "date-fns/locale";
import { TFunction } from "i18next";
import { AlertCircle, Bell, Calendar, CheckCircle, UserPlus, Users, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { AppNotification, NotificationType } from "../../api/notifications";

const getIcon = (notificationType: NotificationType) => {
  switch (notificationType) {
    case "friend_request":
      return <UserPlus className="size-4 text-blue-500" />;
    case "friend_request_accepted":
      return <CheckCircle className="size-4 text-green-500" />;
    case "friend_request_rejected":
      return <XCircle className="size-4 text-red-500" />;
    case "group_invitation":
      return <Users className="size-4 text-brand" />;
    case "event_invitation":
    case "event_reopened":
      return <Calendar className="size-4 text-brand" />;
    case "system_alert":
      return <AlertCircle className="size-4 text-amber-500" />;
    default:
      return <Bell className="size-4 text-brand" />;
  }
};

const getText = (notificationType: NotificationType, t: TFunction) => {
  switch (notificationType) {
    case "friend_request":
      return t("notifications.friendRequest", { defaultValue: "Wysłał(a) Ci zaproszenie do znajomych." });
    case "friend_request_accepted":
      return t("notifications.friendAccepted", { defaultValue: "Zaakceptował(a) Twoje zaproszenie." });
    case "friend_request_rejected":
      return t("notifications.friendRejected", { defaultValue: "Odrzucił(a) Twoje zaproszenie." });
    case "group_invitation":
      return t("notifications.groupInvitation", { defaultValue: "Zaprosił(a) Cię do grupy." });
    case "event_invitation":
      return t("notifications.eventInvitation", { defaultValue: "Zaprosił(a) Cię do wydarzenia." });
    case "event_reopened":
      return t("notifications.eventReopened", { defaultValue: "Wznowił(a) głosowanie w wydarzeniu." });
    case "system_alert":
      return t("notifications.systemAlert", { defaultValue: "Ważne powiadomienie systemowe." });
    default:
      return t("notifications.system", { defaultValue: "Masz nowe powiadomienie." });
  }
};

interface NotificationCardProps {
  notification: AppNotification;
  onRead: (id: string) => void;
  onClosePopover: () => void;
}

export function NotificationCard({ notification, onRead, onClosePopover }: NotificationCardProps) {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();

  const handleCardClick = () => {
    // 1. Mark as read
    if (!notification.read) {
      onRead(notification.id);
    }

    // 2. Navigate based on type
    if (notification.type === "friend_request") {
      navigate("/community/friends#friend-requests");
    } else if (notification.type === "friend_request_accepted") {
      navigate("/community/friends");
    } else if (notification.type === "group_invitation") {
      navigate("/community/groups#group-invitations");
    } else if (notification.type === "event_invitation" || notification.type === "event_reopened") {
      navigate("/planning");
    }

    // 3. Close the popover
    onClosePopover();
  };

  const timeAgo = formatDistanceToNow(notification.createdAt, {
    addSuffix: true,
    locale: i18n.language.startsWith("pl") ? pl : enUS,
  });

  return (
    <button
      type="button"
      onClick={handleCardClick}
      className="flex items-start text-left w-full gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer rounded-lg border border-transparent hover:border-border/50"
    >
      <div className="relative shrink-0">
        <Avatar className="size-10 border border-border/50 shadow-sm">
          <AvatarImage src={notification.senderAvatarUrl} alt={notification.senderUsername} />
          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
            {notification.senderUsername?.charAt(0)?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border border-border shadow-sm">
          {getIcon(notification.type)}
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm text-foreground leading-tight">
          <span className="font-semibold mr-1">{notification.senderUsername}</span>
          <span className="text-muted-foreground">{getText(notification.type, t)}</span>
        </p>
        <p className="text-xs text-muted-foreground">{timeAgo}</p>
      </div>

      {!notification.read && (
        <div className="shrink-0 mt-2">
          <div className="size-2 rounded-full bg-brand" />
        </div>
      )}
    </button>
  );
}
