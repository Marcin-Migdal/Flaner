import { useNavigate } from "react-router";
import { AppNotification } from "../../../api/notifications";
import { getNotificationTarget } from "../../../utils/getNotificationTarget";
import { NotificationContent } from "../NotificationContent";

interface NotificationCardProps {
  notification: AppNotification;
  onRead: (id: string) => void;
  onClosePopover: () => void;
}

export function NotificationCard({ notification, onRead, onClosePopover }: NotificationCardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }

    const target = getNotificationTarget(notification);
    if (target) navigate(target);

    onClosePopover();
  };

  return (
    <button
      type="button"
      onClick={handleCardClick}
      className="flex items-start text-left w-full gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer rounded-lg border border-transparent hover:border-border/50"
    >
      <NotificationContent notification={notification} />

      {!notification.read && (
        <div className="shrink-0 mt-2">
          <div className="size-2 rounded-full bg-brand" />
        </div>
      )}
    </button>
  );
}
