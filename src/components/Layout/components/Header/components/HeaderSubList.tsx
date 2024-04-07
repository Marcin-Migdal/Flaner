import { HeaderItems, SubListPosition } from "../interfaces";
import { ListItem } from "./ListItem";

interface IHeaderSubListProps {
    listItems: HeaderItems[];
    subListPosition: SubListPosition;
    depth: number;
}

export const HeaderSubList = ({ listItems, subListPosition, depth }: IHeaderSubListProps) => {
    return (
        <ul id="header-sub-list" className="header-sub-list" style={subListPosition}>
            {listItems.map((listItem) => (
                <ListItem key={listItem.text} listItem={listItem} depth={depth + 1} openDirection={subListPosition.openDirection} />
            ))}
        </ul>
    );
};
