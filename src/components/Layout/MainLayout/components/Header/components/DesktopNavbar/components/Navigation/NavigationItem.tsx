import { Icon } from "@marcin-migdal/m-component-library";
import { useContext } from "react";
import { useTranslation } from "react-i18next";

import { NavbarItemContext } from "../DesktopNavbarItem/DesktopNavbarItem";
import { DesktopNavbarSubMenu } from "../DesktopNavbarSubMenu/DesktopNavbarSubMenu";
import { NavigationSubMenu } from "./NavigationSubMenu";

export const NavigationItem = () => {
  const {
    item: { icon, text, subItems },
    depth,
    subMenuPosition,
  } = useContext(NavbarItemContext);
  const { t } = useTranslation();

  return (
    <>
      <div className="navbar-item-content">
        {icon && <Icon className={`icon ${icon[1]}`} icon={icon} />}
        {text && <p>{t(text)}</p>}
        {depth !== 0 && !!subItems && subItems.some((item) => !item.disabled) && (
          <Icon className={`icon arrow-indicator`} icon={["fas", "chevron-right"]} />
        )}
      </div>
      {subMenuPosition && (
        <DesktopNavbarSubMenu>
          <NavigationSubMenu />
        </DesktopNavbarSubMenu>
      )}
    </>
  );
};
