import { useTranslation } from "react-i18next";

import { Avatar } from "@components/Avatar";
import { Notification } from "@services/users";
import { toRelativeTime } from "@utils/helpers";

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
                <div className="content-container">
                    <span>
                        {notification.receivedFrom?.name} {t(notification.content)}
                    </span>
                </div>
                <p>{toRelativeTime(notification.createdAt)}</p>
            </div>
        </div>
    );
};
