import { useContext } from "react";

import { Avatar } from "@components/Avatar";
import { DesktopNavbarItem, NavbarItemContext } from "../DesktopNavbarItem/DesktopNavbarItem";
import { NavigationItem } from "../Navigation/NavigationItem";

import "./styles.scss";

export const ProfileSubMenu = () => {
    const {
        item: { iconUrl, subItems },
        subMenuPosition,
        depth,
    } = useContext(NavbarItemContext);

    return (
        <>
            <div className="profile-menu-header">
                {iconUrl !== undefined && <Avatar avatarUrl={iconUrl} />} <h3>Username</h3>
            </div>
            {subItems?.map((listItem) => (
                <DesktopNavbarItem
                    key={listItem.text}
                    navbarItem={listItem}
                    depth={depth + 1}
                    openDirection={subMenuPosition?.openDirection}
                >
                    <NavigationItem />
                </DesktopNavbarItem>
            ))}
        </>
    );
};
