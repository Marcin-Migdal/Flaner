import { useTranslation } from "react-i18next";

import { Avatar } from "@components/Avatar";
import { Notification } from "@services/users";

type MobileNotificationsItemProps = {
    notification: Notification;
};

export const MobileNotificationsItem = ({ notification }: MobileNotificationsItemProps) => {
    const { t } = useTranslation();

    return (
        <div className="mobile-notification-item">
            <Avatar avatarUrl={notification.receivedFrom?.avatarUrl} />

            <span>
                {notification.receivedFrom?.name ? t(notification.receivedFrom.name) : null} {t(notification.content)}
            </span>
        </div>
    );
};