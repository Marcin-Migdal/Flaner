import { Icon } from "@marcin-migdal/m-component-library";
import { useContext } from "react";

import { NavbarItemContext } from "../DesktopNavbarItem/DesktopNavbarItem";
import { DesktopNavbarSubMenu } from "../DesktopNavbarSubMenu/DesktopNavbarSubMenu";
import { NotificationSubMenu } from "./NotificationSubMenu";

import "./styles.scss";

type NotificationItemProps = {
  unreadNotificationCount: number | undefined;
};

export const NotificationItem = ({ unreadNotificationCount }: NotificationItemProps) => {
  const { item, subMenuPosition } = useContext(NavbarItemContext);

  const { icon } = item;

  return (
    <div className="navbar-item-content notification-item">
      {icon && <Icon className={`icon ${icon[1]}`} icon={icon} />}
      {unreadNotificationCount ? <p className="notifications-count">{unreadNotificationCount}</p> : null}
      {subMenuPosition && (
        <DesktopNavbarSubMenu>
          <NotificationSubMenu />
        </DesktopNavbarSubMenu>
      )}
    </div>
  );
};
