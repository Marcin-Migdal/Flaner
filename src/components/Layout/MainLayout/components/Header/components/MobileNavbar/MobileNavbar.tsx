import { Icon } from "@marcin-migdal/m-component-library";
import { useState } from "react";

import { useAppSelector } from "@hooks/redux-hooks";
import { useGetUnreadNotificationsCountQuery, useUpdateReadNotificationMutation } from "@services/users";
import { selectAuthorization } from "@slices/authorization-slice";
import { MobileHeaderMenuOpenType } from "../../interfaces";
import { MobileMenu } from "./components/MobileMenu/MobileMenu";
import { MobileNotifications } from "./components/MobileNotifications/MobileNotifications";

import "./styles.scss";

export type NotificationsTabs = "unread-notification" | "all-notification";

export const MobileNavbar = () => {
  const { authUser } = useAppSelector(selectAuthorization);

  const [menuOpen, setMenuOpen] = useState<MobileHeaderMenuOpenType>("closed");
  const [notificationsOpen, setNotificationsOpen] = useState<MobileHeaderMenuOpenType>("closed");
  const [selectedNotificationTab, setSelectedNotificationTab] = useState<NotificationsTabs>("unread-notification");

  const { data: unreadNotificationCount } = useGetUnreadNotificationsCountQuery(
    { currentUserUid: authUser?.uid },
    { skip: !authUser }
  );
  const [updateReadNotification] = useUpdateReadNotificationMutation();

  const closeMenuDropdown = () => {
    setMenuOpen("closing");

    setTimeout(() => {
      setMenuOpen("closed");
    }, 150);

    return;
  };

  const closeNotificationsDropdown = () => {
    setNotificationsOpen("closing");

    setTimeout(() => {
      setNotificationsOpen("closed");
    }, 150);
  };

  const toggleMenuDropdown = () => {
    if (["mounted", "opened"].includes(menuOpen)) {
      closeMenuDropdown();

      return;
    }

    if (["mounted", "opened"].includes(notificationsOpen)) {
      closeNotificationsDropdown();
    }

    setMenuOpen("mounted");

    setTimeout(() => {
      setMenuOpen("opened");
    }, 0);
  };

  const toggleNotificationsDropdown = () => {
    if (["mounted", "opened"].includes(notificationsOpen)) {
      closeNotificationsDropdown();
      setSelectedNotificationTab("unread-notification");

      if (authUser && unreadNotificationCount) {
        updateReadNotification({ currentUserUid: authUser.uid });
      }

      return;
    }

    if (["mounted", "opened"].includes(menuOpen)) {
      closeMenuDropdown();
    }

    setNotificationsOpen("mounted");

    setTimeout(() => {
      setNotificationsOpen("opened");
    }, 0);
  };

  const handleChangeTab = (tab: NotificationsTabs) => {
    selectedNotificationTab !== tab && setSelectedNotificationTab(tab);
  };

  return (
    <>
      <div className="mobile-buttons-container">
        <div className="open-notifications-btn" onClick={toggleNotificationsDropdown}>
          {notificationsOpen !== "opened" ? <Icon icon={["fas", "bell"]} /> : <Icon icon="close" />}

          {unreadNotificationCount && notificationsOpen === "closed" ? (
            <p className="notifications-count">{unreadNotificationCount}</p>
          ) : null}
        </div>

        <div className="open-menu-btn" onClick={toggleMenuDropdown}>
          {menuOpen !== "opened" ? <Icon icon="bars" /> : <Icon icon="close" />}
        </div>
      </div>

      <MobileNotifications
        notificationsOpen={notificationsOpen}
        selectedNotificationTab={selectedNotificationTab}
        onChangeTab={handleChangeTab}
        authUser={authUser}
      />

      <MobileMenu authUser={authUser} menuOpen={menuOpen} toggleMenuDropdown={toggleMenuDropdown} />
    </>
  );
};
