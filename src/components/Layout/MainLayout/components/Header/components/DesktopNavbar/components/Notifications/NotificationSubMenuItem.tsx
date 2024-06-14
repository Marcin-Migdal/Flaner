import { Avatar } from "@components/Avatar";
import { Notification } from "@services/users";
import { toRelativeTime } from "@utils/helpers";

import "./styles.scss";

type NotificationSubMenuItemProps = {
    notification: Notification;
};

export const NotificationSubMenuItem = ({ notification }: NotificationSubMenuItemProps) => {
    return (
        <div className={`notification-submenu-item`}>
            <Avatar avatarUrl={notification.receivedFrom?.avatarUrl} />
            <div className="right-content">
                <div className="content-container">
                    <span>{notification.content}</span>
                </div>
                <p>{toRelativeTime(notification.createdAt)}</p>
            </div>
        </div>
    );
};
