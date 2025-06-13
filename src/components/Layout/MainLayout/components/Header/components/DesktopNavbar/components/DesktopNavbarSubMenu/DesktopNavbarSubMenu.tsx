import React, { useContext } from "react";

import { NavbarItemContext } from "../DesktopNavbarItem/DesktopNavbarItem";

import "./styles.scss";

type HeaderSubListProps = {
  children: React.ReactElement;
};

export const DesktopNavbarSubMenu = ({ children }: HeaderSubListProps) => {
  const { subMenuPosition } = useContext(NavbarItemContext);

  return (
    <ul className="desktop-navbar-sub-menu" style={subMenuPosition}>
      {children}
    </ul>
  );
};
