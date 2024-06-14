import React, { useContext } from "react";

import { NavbarItemContext } from "../DesktopNavbarItem/DesktopNavbarItem";

import "./styles.scss";

interface IHeaderSubListProps {
    children: React.ReactElement;
}

export const DesktopNavbarSubMenu = ({ children }: IHeaderSubListProps) => {
    const { subMenuPosition } = useContext(NavbarItemContext);

    return (
        <ul className="desktop-navbar-sub-menu" style={subMenuPosition}>
            {children}
        </ul>
    );
};
