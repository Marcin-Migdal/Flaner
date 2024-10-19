import { Icon } from "@Marcin-Migdal/morti-component-library";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { HeaderItem, MobileHeaderMenuOpenType } from "../../../../interfaces";

type MobileHeaderMenuItemProps = {
    navigationItem: HeaderItem;
    closeMenuDropdown: () => void;
    itemPath?: string;
    openMenuItem?: OpenMenuConfig;
    toggleMenuItem?: (text: string, event: React.MouseEvent<HTMLLIElement, MouseEvent>) => void;
    depth: number;
};

export type OpenMenuConfig = {
    openStatus: MobileHeaderMenuOpenType;
    item: string | undefined;
};

export const MobileMenuItem = ({
    navigationItem,
    closeMenuDropdown,
    itemPath,
    openMenuItem,
    toggleMenuItem,
    depth,
}: MobileHeaderMenuItemProps) => {
    const { t } = useTranslation();
    const subMenuRef = useRef<HTMLUListElement>(null);

    const [openSubMenuItem, setOpenSubMenuItem] = useState<OpenMenuConfig>({ openStatus: "closed", item: undefined });

    const { text, onClick, icon, disabled = false, subItems } = navigationItem;
    const hasActiveSubItems = subItems && subItems.filter((item) => !item.disabled).length !== 0;

    const mobileMenuItemClasses = `mobile-menu-item ${disabled || (!onClick && !hasActiveSubItems) ? "disabled" : ""} unselectable`;

    useEffect(() => {
        openSubMenuItem.openStatus === "opened" && handleCloseSubMenuItem();
    }, [openMenuItem?.openStatus]);

    const toggleSubMenuItem = (text: string) => {
        if (["mounted", "opened"].includes(openSubMenuItem.openStatus)) {
            handleCloseSubMenuItem();

            if (openSubMenuItem.item !== text) handleOpenSubMenuItem(text);

            return;
        }

        handleOpenSubMenuItem(text);
    };

    const handleCloseSubMenuItem = () => {
        setOpenSubMenuItem({ openStatus: "closing", item: openSubMenuItem.item });

        setTimeout(() => {
            setOpenSubMenuItem({ openStatus: "closed", item: undefined });
        }, 150);
    };

    const handleOpenSubMenuItem = (text: string) => {
        setOpenSubMenuItem({ openStatus: "mounted", item: text });

        setTimeout(() => {
            setOpenSubMenuItem({ openStatus: "opened", item: text });
        }, 150);
    };

    const handleClick = (event: React.MouseEvent<HTMLLIElement, MouseEvent>) => {
        event.stopPropagation();

        if (toggleMenuItem && subItems && subItems.length !== 0) {
            toggleMenuItem(text as string, event);
            return;
        }

        if (onClick) {
            onClick(event);
            closeMenuDropdown();
        }
    };

    return (
        <li className={mobileMenuItemClasses} onClick={(event) => handleClick(event)}>
            <div className={`mobile-menu-item-content sub-menu-${openMenuItem?.openStatus} ${hasActiveSubItems ? "has-sub-items" : ""}`}>
                {icon && <Icon className={`icon ${icon[1]}`} icon={icon} />}
                {text && <h2>{t(text)}</h2>}
                {hasActiveSubItems && <Icon className={`icon open-indicator`} icon={["fas", "chevron-down"]} />}
            </div>
            {openMenuItem?.item === text && openMenuItem?.openStatus !== "closed" && navigationItem.subItems && (
                <ul
                    ref={subMenuRef}
                    className={`mobile-submenu-list ${openMenuItem?.openStatus} `}
                    style={{ borderColor: depth % 2 ? "var(--grey-color-000)" : "var(--primary-color_680)" }}
                >
                    {navigationItem.subItems.map((navigationItem, index) => (
                        <MobileMenuItem
                            key={index}
                            navigationItem={navigationItem}
                            closeMenuDropdown={closeMenuDropdown}
                            itemPath={`${itemPath}/${text as string}`}
                            openMenuItem={openSubMenuItem}
                            toggleMenuItem={toggleSubMenuItem}
                            depth={depth + 1}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};
