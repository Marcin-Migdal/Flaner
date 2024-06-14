import { AlertHandler, Icon } from "@Marcin-Migdal/morti-component-library";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

import { Avatar } from "@components/Avatar";
import { SignOutAlert } from "@components/index";
import { useAppSelector } from "@hooks/redux-hooks";
import { selectAuthorization } from "@slices/authorization-slice";
import { PATH_CONSTRANTS } from "@utils/enums";
import { HeaderItem, MobileHeaderMenuOpenType } from "../../interfaces";
import { MobileMenuItem } from "./components/MobileMenuItem";

import "./styles.scss";

type MobileHeaderMenuProps = {
    menuItems: HeaderItem[];
};

export const MobileMenu = ({ menuItems }: MobileHeaderMenuProps) => {
    const { authUser } = useAppSelector(selectAuthorization);
    const navigate = useNavigate();
    const alertRef = useRef<AlertHandler>(null);

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

    const settingsItem: HeaderItem = {
        text: "Settings",
        onClick: () => navigate(PATH_CONSTRANTS.SETTINGS),
        icon: ["fas", "gear"],
    };

    const signOutItem: HeaderItem = {
        text: "Sign out",
        onClick: () => alertRef.current?.openAlert(),
        icon: ["fas", "sign-out"],
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
                            <li className="user-item">
                                <Avatar avatarUrl={authUser?.avatarUrl} />
                                <h2>{authUser?.displayName}</h2>
                            </li>
                            {menuItems.map((menuItem) => (
                                <MobileMenuItem menuItem={menuItem} closeMenuDropdown={toggleMenuDropdown} />
                            ))}
                            <MobileMenuItem menuItem={settingsItem} closeMenuDropdown={toggleMenuDropdown} />
                            <MobileMenuItem menuItem={signOutItem} closeMenuDropdown={() => {}} />
                        </ul>
                        <SignOutAlert alertRef={alertRef} onAction={toggleMenuDropdown} />
                    </div>,
                    document.querySelector(".common-wrapper-container") as Element
                )}
        </>
    );
};
