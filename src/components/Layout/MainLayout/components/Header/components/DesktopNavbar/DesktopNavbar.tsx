import { HeaderItem } from "../../interfaces";
import { DesktopNavbarItem } from "./components/DesktopNavbarItem/DesktopNavbarItem";

import "./styles.scss";

type DesktopNavbarProps = {
    menuItems: HeaderItem[];
};

export const DesktopNavbar = ({ menuItems }: DesktopNavbarProps) => {
    return (
        <ul className="desktop-navbar">
            {menuItems.map((item, index) => (
                <DesktopNavbarItem key={index} listItem={item} depth={0} />
            ))}
        </ul>
    );
};
