import { HeaderItem } from "../../interfaces";
import { DesktopHeaderMenuItem } from "./components/DesktopHeaderMenuItem/DesktopHeaderMenuItem";

import "./styles.scss";

type DesktopHeaderMenuProps = {
    menuItems: HeaderItem[];
};

export const DesktopHeaderMenu = ({ menuItems }: DesktopHeaderMenuProps) => {
    return (
        <>
            <ul className="header-list">
                {menuItems.map((item) => (
                    <DesktopHeaderMenuItem key={item.text} listItem={item} depth={0} />
                ))}
            </ul>
        </>
    );
};
