import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { ContentWrapper } from "@components/ContentWrapper";
import { useGetAllNotificationsQuery, useGetUnreadNotificationsQuery } from "@services/users";
import { AuthUserConfigType } from "@slices/authorization-slice";
import { MobileHeaderMenuOpenType } from "../../../../interfaces";
import { NotificationsTabs } from "../../MobileNavbar";
import { MobileNotificationsItem } from "./MobileNotificationsItem";

import "./styles.scss";

type MobileNotificationsProps = {
  notificationsOpen: MobileHeaderMenuOpenType;
  selectedNotificationTab: NotificationsTabs;
  onChangeTab: (tab: NotificationsTabs) => void;
  authUser: AuthUserConfigType | null;
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
            {t("Unread")}
          </button>
          <button
            className={selectedNotificationTab === "all-notification" ? "selected" : ""}
            onClick={() => onChangeTab("all-notification")}
          >
            {t("All notifications")}
          </button>
        </div>

        <ContentWrapper
          query={currentNotificationsQuery}
          placeholdersConfig={{ noData: { message: "No notifications" } }}
          conditions={{
            isUninitialized: currentNotificationsQuery.isUninitialized || currentNotificationsQuery.data?.length === 0,
          }}
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
