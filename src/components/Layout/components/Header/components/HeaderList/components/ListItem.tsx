import { Icon } from "@Marcin-Migdal/morti-component-library";
import { useRef, useState, MouseEvent } from "react";

import { HeaderItems, OpenDirectionType, SubListPosition } from "../../../interfaces";
import { HeaderSubList } from "./HeaderSubList";

interface IListItemProps {
    listItem: HeaderItems;
    depth: number;
    openDirection?: OpenDirectionType;
}

export const ListItem = ({ listItem, depth, openDirection = "right" }: IListItemProps) => {
    const itemRef = useRef<HTMLLIElement>(null);

    const [subListPosition, setSubListPosition] = useState<SubListPosition | undefined>(undefined);
    const { text, onClick, icon, disabled = false, subItems } = listItem;

    const hasActiveSubItems = subItems && subItems.filter((item) => !item.disabled).length !== 0;

    const handleClick = (event) => {
        event.stopPropagation();

        if (disabled || !onClick) return;

        onClick(event);
    };

    const handleMouseEnter = (event: MouseEvent<HTMLLIElement>) => {
        event.stopPropagation();

        if (disabled || !hasActiveSubItems) return;

        if (depth === 0) {
            const { bottom, width } = event.currentTarget.getBoundingClientRect();
            setSubListPosition({ top: bottom, left: 0, minWidth: width, borderTop: "1px solid var(--white)", zIndex: depth + 1 });
        } else {
            const { width, left, right } = event.currentTarget.getBoundingClientRect();

            let validatedOpenDirection: OpenDirectionType = openDirection;

            if (openDirection === "right") validatedOpenDirection = right + width <= window.innerWidth ? "right" : "left";
            else if (openDirection === "left") {
                validatedOpenDirection = left - width >= 0 ? "left" : "right";
            }

            setSubListPosition({
                top: 0,
                left: validatedOpenDirection === "right" ? width : `-${width}px`,
                minWidth: width,
                zIndex: depth + 1,
                openDirection: validatedOpenDirection,
            });
        }
    };

    const handleMouseLeave = (event: MouseEvent<HTMLLIElement>) => {
        if (!(event.relatedTarget instanceof Node)) setSubListPosition(undefined);
        else if (subListPosition && itemRef?.current && !itemRef.current.contains(event.relatedTarget)) {
            setSubListPosition(undefined);
        }
    };

    return (
        <>
            <li
                ref={itemRef}
                className={`list-item ${disabled || (!onClick && !hasActiveSubItems) ? "disabled" : ""}`}
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className="list-item-content">
                    {icon && <Icon className={`icon ${icon[1]}`} icon={icon} />}
                    <p>{text}</p>
                    {depth !== 0 && hasActiveSubItems && <Icon className={`icon arrow-indicator`} icon={["fas", "chevron-right"]} />}
                </div>
                {subListPosition && hasActiveSubItems && (
                    <HeaderSubList listItems={subItems} subListPosition={subListPosition} depth={depth} />
                )}
            </li>
        </>
    );
};
