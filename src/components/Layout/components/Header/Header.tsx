import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import React, { MouseEvent } from "react";

import { HeaderMainList } from "./components/HeaderMainList";
import { signOut } from "@slices/authorization-slice";
import { useAppDispatch } from "@hooks/redux-hooks";
import { PATH_CONSTRANTS } from "@utils/enums";
import { HeaderItems } from "./interfaces";

import "./styles.css";

// TODO! rozbudować logike strzałki od subitems w ItemList, żeby wskazywała w lewo jeżeli kierunek otwarcia to lewo
// TODO! dodać scss do projektu i zrobić refactor css

// TODO! do naprawy tile view, szerokość tile jest zła, ustawić ją na procenty nie na vw, zrobić

//? ogarnąć jak to podzielić w zakupy page, na listę zakupów, oraz produkty, jakieś tab'y?

export const Header = () => {
    const { t } = useTranslation(["header"]);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const handleSignOut = () => dispatch(signOut({ t: t }));

    const goTo = (to: PATH_CONSTRANTS, event: MouseEvent<HTMLElement>) => {
        navigate(to);
    };

    const listItems: HeaderItems[] = [
        {
            text: t("Community"),
            onClick: (event) => goTo(PATH_CONSTRANTS.COMMUNITY, event),
            icon: ["fas", "person"],
            subItems: [
                {
                    text: t("Friends"),
                    onClick: (event) => goTo(PATH_CONSTRANTS.FRIENDS, event),
                    icon: ["fas", "person"],
                },
                {
                    text: t("Groups"),
                    onClick: (event) => goTo(PATH_CONSTRANTS.GROUPS, event),
                    icon: ["fas", "people-group"],
                },
            ],
        },
        {
            text: t("Planning"),
            onClick: (event) => goTo(PATH_CONSTRANTS.PLANNING, event),
            icon: ["fas", "layer-group"],
            subItems: [
                {
                    text: t("To Do"),
                    onClick: (event) => goTo(PATH_CONSTRANTS.TODO, event),
                    icon: ["fas", "list"],
                },
                {
                    text: t("Shopping"),
                    onClick: (event) => goTo(PATH_CONSTRANTS.SHOPPING, event),
                    icon: ["fas", "cart-shopping"],
                },
                {
                    text: t("Products"),
                    onClick: (event) => goTo(PATH_CONSTRANTS.PRODUCTS, event),
                    icon: ["fas", "drumstick-bite"],
                },
            ],
        },
        {
            text: t("Settings"),
            onClick: (event) => goTo(PATH_CONSTRANTS.SETTINGS, event),
            icon: ["fas", "gear"],
        },
        { text: t("Sign Out"), onClick: handleSignOut, icon: ["fas", "sign-out"] },
    ];

    return (
        <div className="header">
            <h2 onClick={(event) => goTo(PATH_CONSTRANTS.HOME, event)}>{process.env.APP_NAME}</h2>
            <HeaderMainList listItems={listItems} />
        </div>
    );
};
