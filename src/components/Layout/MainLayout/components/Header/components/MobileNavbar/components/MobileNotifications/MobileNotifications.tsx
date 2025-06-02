import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { useGetAllNotificationsQuery, useGetUnreadNotificationsQuery } from "@services/Notifications";
import { AuthUser } from "@slices";

import { ContentWrapper } from "../../../../../../../../ContentWrapper";
import { MobileHeaderMenuOpenType } from "../../../../types";
import { NotificationsTabs } from "../../MobileNavbar";

import { MobileNotificationsItem } from "./MobileNotificationsItem";
import "./styles.scss";

type MobileNotificationsProps = {
  notificationsOpen: MobileHeaderMenuOpenType;
  selectedNotificationTab: NotificationsTabs;
  onChangeTab: (tab: NotificationsTabs) => void;
  authUser: AuthUser | null;
};

export const MobileNotifications = ({
  notificationsOpen,
  selectedNotificationTab,
  onChangeTab,
  authUser,
}: MobileNotificationsProps) => {
  const { t } = useTranslation();

  const unreadNotificationQuery = useGetUnreadNotificationsQuery(
    { currentUserUid: authUser?.uid },
    { skip: !authUser?.uid || selectedNotificationTab === "all-notification" }
  );

  const allNotificationQuery = useGetAllNotificationsQuery(
    { currentUserUid: authUser?.uid },
    { skip: !authUser?.uid || selectedNotificationTab === "unread-notification" }
  );

  const currentNotificationsQuery =
    selectedNotificationTab === "unread-notification" ? unreadNotificationQuery : allNotificationQuery;

  if (notificationsOpen === "closed") {
    return null;
  }

  return createPortal(
    <div className={`mobile-notifications ${notificationsOpen}`}>
      <ul className="mobile-notifications-list">
        <div className="buttons-container">
          <button
            className={selectedNotificationTab === "unread-notification" ? "selected" : ""}
            onClick={() => onChangeTab("unread-notification")}
          >
            {t("nav.notifications.unread")}
          </button>
          <button
            className={selectedNotificationTab === "all-notification" ? "selected" : ""}
            onClick={() => onChangeTab("all-notification")}
          >
            {t("nav.notifications.all")}
          </button>
        </div>

        <ContentWrapper
          query={currentNotificationsQuery}
          placeholdersConfig={{ noData: { message: t("notifications.noNotifications") } }}
        >
          {({ data }) => (
            <>
              {data.map((notification) => (
                <MobileNotificationsItem notification={notification} key={notification.id} />
              ))}
            </>
          )}
        </ContentWrapper>
      </ul>
    </div>,
    document.querySelector(".common-wrapper-container") as Element
  );
};
