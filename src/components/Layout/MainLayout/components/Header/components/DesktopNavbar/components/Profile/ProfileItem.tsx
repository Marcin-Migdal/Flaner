import { useContext } from "react";

import { Avatar } from "@components/Avatar";
import { NavbarItemContext } from "../DesktopNavbarItem/DesktopNavbarItem";
import { DesktopNavbarSubMenu } from "../DesktopNavbarSubMenu/DesktopNavbarSubMenu";
import { ProfileSubMenu } from "./ProfileSubMenu";

export const ProfileItem = () => {
    const {
        item: { iconUrl },
        subMenuPosition,
    } = useContext(NavbarItemContext);

    return (
        <div className="navbar-item-content">
            {iconUrl !== undefined && <Avatar avatarUrl={iconUrl} />}
            {subMenuPosition && (
                <DesktopNavbarSubMenu>
                    <ProfileSubMenu />
                </DesktopNavbarSubMenu>
            )}
        </div>
    );
};
