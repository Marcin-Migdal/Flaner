import { useContext } from "react";

import { Avatar } from "../../../../../../../../Avatar";
import { DesktopNavbarItem, NavbarItemContext } from "../DesktopNavbarItem/DesktopNavbarItem";
import { NavigationItem } from "../Navigation/NavigationItem";

import "./styles.scss";

export const ProfileSubMenu = () => {
  const {
    item: { subItems, metaData },
    subMenuPosition,
    depth,
  } = useContext(NavbarItemContext);

  return (
    <>
      <div className="profile-menu-header">
        {metaData.user?.avatarUrl !== undefined && <Avatar avatarUrl={metaData?.user?.avatarUrl} />}
        <h3>{metaData.user?.username}</h3>
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
