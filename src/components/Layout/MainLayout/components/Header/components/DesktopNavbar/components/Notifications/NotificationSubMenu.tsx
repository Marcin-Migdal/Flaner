import { Icon } from "@marcin-migdal/m-component-library";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppSelector } from "@hooks";
import { useGetAllNotificationsQuery, useGetUnreadNotificationsQuery } from "@services/users";
import { selectAuthorization } from "@slices";

import { ContentWrapper } from "../../../../../../../../ContentWrapper";
import { DesktopNavbarItem, NavbarItemContext } from "../DesktopNavbarItem/DesktopNavbarItem";
import { NotificationSubMenuItem } from "./NotificationSubMenuItem";

import "./styles.scss";

type Tabs = "unread-notification" | "all-notification";

export const NotificationSubMenu = () => {
  const { t } = useTranslation();

  const { depth, subMenuPosition } = useContext(NavbarItemContext);
  const { authUser } = useAppSelector(selectAuthorization);

  const [selectedTab, setSelectedTab] = useState<Tabs>("unread-notification");

  const unreadNotificationQuery = useGetUnreadNotificationsQuery(
    { currentUserUid: authUser?.uid },
    { skip: !authUser?.uid || selectedTab === "all-notification" }
  );

  const allNotificationQuery = useGetAllNotificationsQuery(
    { currentUserUid: authUser?.uid },
    { skip: !authUser?.uid || selectedTab === "unread-notification" }
  );

  const currentQuery = selectedTab === "unread-notification" ? unreadNotificationQuery : allNotificationQuery;

  const handleChangeTab = (tab: Tabs) => () => {
    selectedTab !== tab && setSelectedTab(tab);
  };

  return (
    <div>
      <div className="tab-buttons-container">
        <div
          className={selectedTab === "unread-notification" ? "selected" : ""}
          onClick={handleChangeTab("unread-notification")}
        >
          {t("Unread")}
        </div>
        <div
          className={selectedTab === "all-notification" ? "selected" : ""}
          onClick={handleChangeTab("all-notification")}
        >
          {t("All")}
        </div>
      </div>

      <ContentWrapper query={currentQuery}>
        {({ data }) => {
          return data.length === 0 ? (
            <DesktopNavbarItem
              className="no-notification-item"
              key="no-notification-message"
              navbarItem={{}}
              depth={depth + 1}
              openDirection={subMenuPosition?.openDirection}
            >
              <Icon icon={["fas", "triangle-exclamation"]} />
              <h3>{t("No notifications")}</h3>
            </DesktopNavbarItem>
          ) : (
            <>
              {data.map((notification) => {
                return (
                  <DesktopNavbarItem
                    key={notification.createdAt}
                    navbarItem={{}}
                    depth={depth + 1}
                    openDirection={subMenuPosition?.openDirection}
                  >
                    <NotificationSubMenuItem notification={notification} />
                  </DesktopNavbarItem>
                );
              })}
            </>
          );
        }}
      </ContentWrapper>
    </div>
  );
};
