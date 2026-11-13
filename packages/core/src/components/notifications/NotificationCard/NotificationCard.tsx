import type { AppNotification } from "@flaner/shared/api";
import { useOpenNotification } from "../../../hooks/useOpenNotification";
import { NotificationContent } from "../NotificationContent";

interface NotificationCardProps {
  notification: AppNotification;
  onRead: (id: string) => void;
  onClosePopover: () => void;
}

export function NotificationCard({ notification, onRead, onClosePopover }: NotificationCardProps) {
  const openNotification = useOpenNotification();

  const handleCardClick = () => {
    if (!notification.read) {
      onRead(notification.id);
    }

    onClosePopover();
    void openNotification(notification);
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
