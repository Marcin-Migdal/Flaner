import { useContext } from "react";

import { DesktopNavbarItem, NavbarItemContext } from "../DesktopNavbarItem/DesktopNavbarItem";
import { NavigationItem } from "./NavigationItem";

export const NavigationSubMenu = () => {
    const {
        item: { subItems },
        depth,
        subMenuPosition,
    } = useContext(NavbarItemContext);

    return (
        <>
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
