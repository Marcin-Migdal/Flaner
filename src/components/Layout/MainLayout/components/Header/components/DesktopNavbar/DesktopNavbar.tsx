import { useAppSelector } from "@hooks/index";
import { useGetUnreadNotificationsCountQuery, useUpdateReadNotificationMutation } from "@services/users";
import { selectAuthorization } from "@slices/authorization-slice";
import { HeaderItem } from "../../interfaces";
import { DesktopNavbarItem } from "./components/DesktopNavbarItem/DesktopNavbarItem";
import { NavigationItem } from "./components/Navigation/NavigationItem";
import { NotificationItem } from "./components/Notifications/NotificationItem";
import { ProfileItem } from "./components/Profile/ProfileItem";

import "./styles.scss";

export type DesktopNavbarProps = {
    navigationItems: HeaderItem[];
    userProfileItem: HeaderItem;
};

export const DesktopNavbar = ({ navigationItems, userProfileItem }: DesktopNavbarProps) => {
    const { authUser } = useAppSelector(selectAuthorization);

    const [updateReadNotification] = useUpdateReadNotificationMutation();
    const unreadNotificationCountQuery = useGetUnreadNotificationsCountQuery({ currentUserUid: authUser?.uid }, { skip: !authUser });

    const navigationItemsLength: number = navigationItems.length;

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
        </ul>
    );
};
