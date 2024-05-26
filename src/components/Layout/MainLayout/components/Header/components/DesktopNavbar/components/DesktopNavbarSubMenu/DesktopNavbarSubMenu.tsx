import { HeaderItem, SubMenuPosition } from "../../../../interfaces";
import { DesktopNavbarItem } from "../DesktopNavbarItem/DesktopNavbarItem";

import "./styles.scss";

interface IHeaderSubListProps {
    listItems: HeaderItem[];
    subListPosition: SubMenuPosition;
    depth: number;
}

export const DesktopNavbarSubMenu = ({ listItems, subListPosition, depth }: IHeaderSubListProps) => {
    return (
        <ul className="desktop-navbar-sub-menu" style={subListPosition}>
            {listItems.map((listItem) => (
                <DesktopNavbarItem
                    key={listItem.text}
                    listItem={listItem}
                    depth={depth + 1}
                    openDirection={subListPosition.openDirection}
                />
            ))}
        </ul>
    );
};
