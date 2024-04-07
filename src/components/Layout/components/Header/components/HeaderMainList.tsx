import { HeaderItems } from "../interfaces";
import { ListItem } from "./ListItem";

interface IHeaderMainListProps {
    listItems: HeaderItems[];
}

export const HeaderMainList = ({ listItems }: IHeaderMainListProps) => {
    return (
        <ul id="header-main-list" className="header-main-list">
            {listItems.map((listItem) => (
                <ListItem key={listItem.text} listItem={listItem} depth={0} />
            ))}
        </ul>
    );
};
