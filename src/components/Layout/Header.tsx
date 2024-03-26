import { Icon } from "@Marcin-Migdal/morti-component-library";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import React from "react";

import { signOut } from "@slices/authorization-slice";
import { useAppDispatch } from "@hooks/redux-hooks";
import { PATH_CONSTRANTS } from "@utils/enums";

import "./style.css";

type HeaderItems = {
    text: string;
    onClick: () => void;
    icon?: IconProp;
    disabled?: boolean;
};

export const Header = () => {
    const navigate = useNavigate();
    const { t } = useTranslation(["header"]);
    const dispatch = useAppDispatch();

    const handleSignOut = () => dispatch(signOut({ t: t }));

    const headerItems: HeaderItems[] = [
        { text: t("Community"), onClick: () => navigate(PATH_CONSTRANTS.COMMUNITY), icon: ["fas", "person"] },
        { text: t("Planning"), onClick: () => navigate(PATH_CONSTRANTS.HOME), icon: ["fas", "layer-group"] },
        { text: t("Sign out"), onClick: handleSignOut, icon: ["fas", "sign-out"] },
    ];

    return (
        <div className="header">
            <h2 onClick={() => navigate(PATH_CONSTRANTS.HOME)}>Flaner</h2>
            <ul className="header-list">
                {headerItems.map((item) => {
                    const { text, onClick, icon, disabled = false } = item;

                    return (
                        <li className={`item ${disabled ? "disabled" : ""}`} onClick={() => !disabled && onClick()}>
                            {icon && <Icon className={`icon ${icon[1]}`} icon={icon} />}
                            <p>{text}</p>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
