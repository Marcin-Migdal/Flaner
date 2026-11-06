import { Avatar, AvatarFallback, AvatarImage } from "@flaner/ui-components";
import { formatDistanceToNow } from "date-fns";
import { pl, enUS } from "date-fns/locale";
import { TFunction } from "i18next";
import { AlertCircle, Bell, Calendar, CheckCircle, Crown, HandCoins, Trash2, UserPlus, Users, Wallet, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppNotification, NotificationType } from "../../../api/notifications";

const getIcon = (notificationType: NotificationType) => {
  switch (notificationType) {
    case "friend_request":
      return <UserPlus className="size-4 text-blue-500" />;
    case "friend_request_accepted":
    case "group_invitation_accepted":
    case "group_request_accepted":
      return <CheckCircle className="size-4 text-green-500" />;
    case "friend_request_rejected":
    case "group_invitation_rejected":
    case "group_request_rejected":
      return <XCircle className="size-4 text-red-500" />;
    case "group_ownership_transferred":
      return <Crown className="size-4 text-amber-500" />;
    case "group_deleted":
      return <Trash2 className="size-4 text-red-500" />;
    case "group_invitation":
      return <Users className="size-4 text-brand" />;
    case "event_invitation":
    case "event_reopened":
      return <Calendar className="size-4 text-brand" />;
    case "split_group_invitation":
      return <Wallet className="size-4 text-brand" />;
    case "split_settlement_pending":
      return <HandCoins className="size-4 text-amber-500" />;
    case "system_alert":
      return <AlertCircle className="size-4 text-amber-500" />;
    default:
      return <Bell className="size-4 text-brand" />;
  }
};

const getText = ({ type, groupName }: AppNotification, t: TFunction) => {
  switch (type) {
    case "friend_request":
      return t("notifications.friendRequest");
    case "friend_request_accepted":
      return t("notifications.friendAccepted");
    case "friend_request_rejected":
      return t("notifications.friendRejected");
    case "group_invitation":
      return t("notifications.groupInvitation");
    case "group_invitation_accepted":
      return t("notifications.groupInvitationAccepted", { groupName });
    case "group_invitation_rejected":
      return t("notifications.groupInvitationRejected", { groupName });
    case "group_request_accepted":
      return t("notifications.groupRequestAccepted", { groupName });
    case "group_request_rejected":
      return t("notifications.groupRequestRejected", { groupName });
    case "group_ownership_transferred":
      return t("notifications.groupOwnershipTransferred", { groupName });
    case "group_deleted":
      return t("notifications.groupDeleted", { groupName });
    case "event_invitation":
      return t("notifications.eventInvitation");
    case "event_reopened":
      return t("notifications.eventReopened");
    case "split_group_invitation":
      return t("notifications.splitGroupInvitation");
    case "split_settlement_pending":
      return t("notifications.splitSettlementPending");
    case "system_alert":
      return t("notifications.systemAlert");
    default:
      return t("notifications.system");
  }
};

type NotificationContentProps = {
  notification: AppNotification;
};

/** Avatar with the type icon, sender + text and time: shared by the popover card and the toast. */
export function NotificationContent({ notification }: NotificationContentProps) {
  const { t, i18n } = useTranslation("common");

  const timeAgo = formatDistanceToNow(notification.createdAt, {
    addSuffix: true,
    locale: i18n.language.startsWith("pl") ? pl : enUS,
  });

  return (
    <>
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
          <span className="text-muted-foreground">{getText(notification, t)}</span>
        </p>
        <p className="text-xs text-muted-foreground">{timeAgo}</p>
      </div>
    </>
  );
}
