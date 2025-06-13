import { useContext } from "react";

import { Avatar } from "../../../../../../../../Avatar";
import { NavbarItemContext } from "../DesktopNavbarItem/DesktopNavbarItem";
import { DesktopNavbarSubMenu } from "../DesktopNavbarSubMenu/DesktopNavbarSubMenu";
import { ProfileSubMenu } from "./ProfileSubMenu";

export const ProfileItem = () => {
  const {
    item: { metaData },
    subMenuPosition,
  } = useContext(NavbarItemContext);

  return (
    <div className="navbar-item-content">
      <Avatar avatarUrl={metaData?.user?.avatarUrl} />
      {subMenuPosition && (
        <DesktopNavbarSubMenu>
          <ProfileSubMenu />
        </DesktopNavbarSubMenu>
      )}
    </div>
  );
};
