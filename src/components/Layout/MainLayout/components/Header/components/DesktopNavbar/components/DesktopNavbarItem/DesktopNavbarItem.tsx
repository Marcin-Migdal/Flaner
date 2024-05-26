import { Icon } from "@Marcin-Migdal/morti-component-library";
import { MouseEvent, useRef, useState } from "react";

import { HeaderItem, OpenDirectionType, SubMenuPosition } from "../../../../interfaces";
import { DesktopNavbarSubMenu } from "../DesktopNavbarSubMenu/DesktopNavbarSubMenu";

import { Avatar } from "@components/Avatar";
import "./styles.scss";

interface INavbarItemProps {
    listItem: HeaderItem;
    depth: number;
    openDirection?: OpenDirectionType;
}

export const DesktopNavbarItem = ({ listItem, depth, openDirection = "right" }: INavbarItemProps) => {
    const itemRef = useRef<HTMLLIElement>(null);

    const [subMenuPosition, setSubMenuPosition] = useState<SubMenuPosition | undefined>(undefined);
    const { text, onClick, icon, iconUrl, disabled = false, subItems } = listItem;

    const hasActiveSubMenu = subItems && subItems.filter((item) => !item.disabled).length !== 0;

    const handleClick = (event) => {
        event.stopPropagation();

        if (disabled || !onClick) return;

        onClick(event);
    };

    const handleMouseEnter = (event: MouseEvent<HTMLLIElement>) => {
        event.stopPropagation();

        if (disabled || !hasActiveSubMenu) return;

        const { bottom, width, left, right } = event.currentTarget.getBoundingClientRect();

        let validatedOpenDirection: OpenDirectionType = openDirection;

        if (openDirection === "right") validatedOpenDirection = right + width <= window.innerWidth ? "right" : "left";
        else if (openDirection === "left") {
            validatedOpenDirection = left - width >= 0 ? "left" : "right";
        }

        if (depth === 0) {
            setSubMenuPosition({
                top: bottom,
                left: validatedOpenDirection === "right" ? 0 : "unset",
                right: validatedOpenDirection === "right" ? "unset" : 0,
                minWidth: width,
                borderTop: "1px solid var(--white)",
                zIndex: depth + 1,
            });
        } else {
            setSubMenuPosition({
                top: 0,
                left: validatedOpenDirection === "right" ? width : `-${width}px`,
                minWidth: width,
                zIndex: depth + 1,
                openDirection: validatedOpenDirection,
            });
        }
    };

    const handleMouseLeave = (event: MouseEvent<HTMLLIElement>) => {
        if (!(event.relatedTarget instanceof Node)) setSubMenuPosition(undefined);
        else if (subMenuPosition && itemRef?.current && !itemRef.current.contains(event.relatedTarget)) {
            setSubMenuPosition(undefined);
        }
    };

    return (
        <li
            ref={itemRef}
            className={`navbar-item ${disabled || (!onClick && !hasActiveSubMenu) ? "disabled" : ""}`}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="navbar-item-content">
                {icon && <Icon className={`icon ${icon[1]}`} icon={icon} />}
                {iconUrl !== undefined && <Avatar avatarUrl={iconUrl} />}
                {text && <p>{text}</p>}
                {depth !== 0 && hasActiveSubMenu && <Icon className={`icon arrow-indicator`} icon={["fas", "chevron-right"]} />}
            </div>
            {subMenuPosition && hasActiveSubMenu && (
                <DesktopNavbarSubMenu listItems={subItems} subListPosition={subMenuPosition} depth={depth} />
            )}
        </li>
    );
};
