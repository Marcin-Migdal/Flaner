import { Icon } from "@Marcin-Migdal/morti-component-library";
import { useRef, useState } from "react";

import { HeaderItem, MobileHeaderMenuOpenType } from "../../../interfaces";

type MobileHeaderMenuItemProps = {
    menuItem: HeaderItem;
    closeMenuDropdown: () => void;
};

export const MobileHeaderMenuItem = ({ menuItem, closeMenuDropdown }: MobileHeaderMenuItemProps) => {
    const subMenuRef = useRef<HTMLUListElement>(null);

    const { text, onClick, icon, disabled = false, subItems } = menuItem;
    const hasActiveSubItems = subItems && subItems.filter((item) => !item.disabled).length !== 0;

    const [subMenuOpen, setSubMenuOpen] = useState<MobileHeaderMenuOpenType>("closed");

    const handleClick = (event) => {
        event.stopPropagation();

        if (disabled) return;

        if (!hasActiveSubItems && onClick) {
            onClick(event);
            closeMenuDropdown();
            return;
        }

        toggleSubMenuDropdown();
    };

    const toggleSubMenuDropdown = () => {
        if (["mounted", "opened"].includes(subMenuOpen)) {
            setSubMenuOpen("closing");

            setTimeout(() => {
                setSubMenuOpen("closed");
            }, 150);

            return;
        }

        setSubMenuOpen("mounted");

        setTimeout(() => {
            setSubMenuOpen("opened");
        }, 0);
    };

    const mobileMenuItemClasses = `mobile-menu-item ${disabled || (!onClick && !hasActiveSubItems) ? "disabled" : ""} unselectable`;

    return (
        <li className={mobileMenuItemClasses} onClick={handleClick}>
            <div className={`mobile-menu-item-content sub-menu-${subMenuOpen} ${hasActiveSubItems ? "has-sub-items" : ""}`}>
                {icon && <Icon className={`icon ${icon[1]}`} icon={icon} />}
                <h2>{text}</h2>
            </div>
            {subMenuOpen !== "closed" && menuItem.subItems && (
                <ul ref={subMenuRef} className={`mobile-submenu-list ${subMenuOpen} `}>
                    {menuItem.subItems.map((menuItem) => (
                        <MobileHeaderMenuItem menuItem={menuItem} closeMenuDropdown={closeMenuDropdown} />
                    ))}
                </ul>
            )}
        </li>
    );
};
