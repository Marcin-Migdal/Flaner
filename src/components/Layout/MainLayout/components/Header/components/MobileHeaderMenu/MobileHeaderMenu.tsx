import { Icon } from "@Marcin-Migdal/morti-component-library";
import { useState } from "react";
import { createPortal } from "react-dom";

import { HeaderItem, MobileHeaderMenuOpenType } from "../../interfaces";
import { MobileHeaderMenuItem } from "./components/MobileHeaderMenuItem";

import "./styles.scss";

type MobileHeaderMenuProps = {
    menuItems: HeaderItem[];
};

export const MobileHeaderMenu = ({ menuItems }: MobileHeaderMenuProps) => {
    const [menuOpen, setMenuOpen] = useState<MobileHeaderMenuOpenType>("closed");

    const toggleMenuDropdown = () => {
        if (["mounted", "opened"].includes(menuOpen)) {
            setMenuOpen("closing");

            setTimeout(() => {
                setMenuOpen("closed");
            }, 150);

            return;
        }

        setMenuOpen("mounted");

        setTimeout(() => {
            setMenuOpen("opened");
        }, 0);
    };

    return (
        <>
            <div className="open-menu-btn" onClick={toggleMenuDropdown}>
                {menuOpen !== "opened" ? <Icon icon="bars" /> : <Icon icon="close" />}
            </div>
            {menuOpen !== "closed" &&
                createPortal(
                    <div className={`mobile-menu ${menuOpen}`}>
                        <ul className="mobile-menu-list">
                            {menuItems.map((menuItem) => (
                                <MobileHeaderMenuItem menuItem={menuItem} closeMenuDropdown={toggleMenuDropdown} />
                            ))}
                        </ul>
                    </div>,
                    document.querySelector(".common-wrapper-container") as Element
                )}
        </>
    );
};
