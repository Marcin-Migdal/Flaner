import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { SignOutAlert } from "@components/alerts";
import { useAppSelector } from "@hooks/index";
import { useGetUnreadNotificationsCountQuery, useUpdateReadNotificationMutation } from "@services/users";
import { selectAuthorization } from "@slices/authorization-slice";
import { navigationTree } from "@utils/constants";
import { PATH_CONSTRANTS } from "@utils/enums";
import { mapNavigationTree } from "@utils/helpers/mapNavigationTree";
import { HeaderItem } from "../../interfaces";
import { DesktopNavbarItem } from "./components/DesktopNavbarItem/DesktopNavbarItem";
import { NavigationItem } from "./components/Navigation/NavigationItem";
import { NotificationItem } from "./components/Notifications/NotificationItem";
import { ProfileItem } from "./components/Profile/ProfileItem";

import { useAlert } from "@marcin-migdal/m-component-library";
import "./styles.scss";

export const DesktopNavbar = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { authUser } = useAppSelector(selectAuthorization);

  const [handleOpenAlert, alertProps] = useAlert();

  const [updateReadNotification] = useUpdateReadNotificationMutation();
  const unreadNotificationCountQuery = useGetUnreadNotificationsCountQuery(
    { currentUserUid: authUser?.uid },
    { skip: !authUser }
  );

  const navigationItems: HeaderItem[] = mapNavigationTree(t, navigate, navigationTree);
  const navigationItemsLength: number = navigationItems.length;

  const userProfileItem: HeaderItem = {
    metaData: { user: authUser },
    subItems: [
      { text: "Settings", onClick: () => navigate(PATH_CONSTRANTS.SETTINGS), icon: ["fas", "gear"] },
      { text: "Sign out", onClick: handleOpenAlert, icon: ["fas", "sign-out"] },
    ],
  };

  const handleClose = () => {
    if (authUser && unreadNotificationCountQuery.data) {
      updateReadNotification({ currentUserUid: authUser.uid });
    }
  };

  return (
    <ul className="desktop-navbar">
      {navigationItems.map((item, index) => (
        <DesktopNavbarItem key={index} navbarItem={item} depth={0}>
          <NavigationItem />
        </DesktopNavbarItem>
      ))}
      <DesktopNavbarItem
        onClose={handleClose}
        key={navigationItemsLength}
        navbarItem={{ icon: ["fas", "bell"] }}
        openDirection="left"
        alwaysOpenSubMenu
      >
        <NotificationItem unreadNotificationCount={unreadNotificationCountQuery.data} />
      </DesktopNavbarItem>
      <DesktopNavbarItem key={navigationItemsLength + 1} navbarItem={userProfileItem}>
        <ProfileItem />
      </DesktopNavbarItem>

      <SignOutAlert {...alertProps} />
    </ul>
  );
};
