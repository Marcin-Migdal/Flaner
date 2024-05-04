import { HeaderItem, SubListPosition } from "../../../../interfaces";
import { DesktopHeaderMenuItem } from "../DesktopHeaderMenuItem/DesktopHeaderMenuItem";

import "./styles.scss";

interface IHeaderSubListProps {
    listItems: HeaderItem[];
    subListPosition: SubListPosition;
    depth: number;
}

export const DesktopHeaderSubMenu = ({ listItems, subListPosition, depth }: IHeaderSubListProps) => {
    return (
        <ul className="header-sub-list" style={subListPosition}>
            {listItems.map((listItem) => (
                <DesktopHeaderMenuItem
                    key={listItem.text}
                    listItem={listItem}
                    depth={depth + 1}
                    openDirection={subListPosition.openDirection}
                />
            ))}
        </ul>
    );
};
