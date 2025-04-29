import { useTranslation } from "react-i18next";

import { Notification } from "../../../../../../../../../app/services/users";
import { toRelativeTime } from "../../../../../../../../../utils/helpers";
import { Avatar } from "../../../../../../../../Avatar";

import "./styles.scss";

type NotificationSubMenuItemProps = {
  notification: Notification;
};

export const NotificationSubMenuItem = ({ notification }: NotificationSubMenuItemProps) => {
  const { t } = useTranslation();

  return (
    <div className={`notification-submenu-item`}>
      <Avatar avatarUrl={notification.receivedFrom?.avatarUrl} />
      <div className="right-content">
        <div className="notification-content-container">
          <span>
            {notification.receivedFrom?.name} {t(notification.content)}
          </span>
        </div>
        <p>{toRelativeTime(notification.createdAt)}</p>
      </div>
    </div>
  );
};
