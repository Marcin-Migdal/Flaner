import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AppNotification } from "../../../api/notifications";
import { NotificationContent } from "../NotificationContent";

type NotificationToastProps = {
  notification: AppNotification;
  onOpen: () => void;
  onClose: () => void;
};

export function NotificationToast({ notification, onOpen, onClose }: NotificationToastProps) {
  const { t } = useTranslation("common");

  return (
    // The Toaster's toast classes give the card look (background, border, padding)
    <div className="flex items-start gap-1 w-full">
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-1 min-w-0 items-start text-left gap-3 cursor-pointer"
      >
        <NotificationContent notification={notification} />
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("notifications.toast.dismiss")}
        className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
