import { useContext, useState } from "react";

import { Icon } from "@Marcin-Migdal/morti-component-library";
import { ContentWrapper } from "@components/ContentWrapper";
import { useAppSelector } from "@hooks/redux-hooks";
import { useGetAllNotificationsQuery, useGetUnreadNotificationsQuery } from "@services/users";
import { selectAuthorization } from "@slices/authorization-slice";
import { DesktopNavbarItem, NavbarItemContext } from "../DesktopNavbarItem/DesktopNavbarItem";
import { NotificationSubMenuItem } from "./NotificationSubMenuItem";

import "./styles.scss";

type Tabs = "unread-notification" | "all-notification";

type NotificationSubMenuProps = {
    unreadNotificationCount: number | undefined;
};

export const NotificationSubMenu = ({ unreadNotificationCount }: NotificationSubMenuProps) => {
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
                <div className={selectedTab === "unread-notification" ? "selected" : ""} onClick={handleChangeTab("unread-notification")}>
                    <h3>Unread</h3>
                </div>
                <div className={selectedTab === "all-notification" ? "selected" : ""} onClick={handleChangeTab("all-notification")}>
                    <h3>All </h3>
                </div>
            </div>

            <ContentWrapper query={currentQuery}>
                {({ data }) => (
                    <>
                        {data.length === 0 ? (
                            <DesktopNavbarItem
                                className="no-notification-item"
                                key="no-notification-message"
                                navbarItem={{}}
                                depth={depth + 1}
                                openDirection={subMenuPosition?.openDirection}
                            >
                                <Icon icon={["fas", "triangle-exclamation"]} />
                                <h3>No notifications</h3>
                            </DesktopNavbarItem>
                        ) : (
                            data.map((notification) => {
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
                            })
                        )}
                    </>
                )}
            </ContentWrapper>
        </div>
    );
};
