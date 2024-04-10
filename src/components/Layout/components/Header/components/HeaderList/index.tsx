import { useTranslation } from "react-i18next";
import React, { MouseEvent } from "react";

import { HeaderItems } from "../../interfaces";
import { ListItem } from "./ListItem";

import { signOut } from "@slices/authorization-slice";
import { PATH_CONSTRANTS } from "@utils/enums";
import { useAppDispatch } from "@hooks/index";

import "./styles.scss";

interface IHeaderListProps {
    goTo: (path: PATH_CONSTRANTS, event: MouseEvent<HTMLElement>) => void;
}

export const HeaderList = ({ goTo }: IHeaderListProps) => {
    const { t } = useTranslation(["header"]);
    const dispatch = useAppDispatch();

    const handleSignOut = () => dispatch(signOut({ t: t }));

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
        <ul className="header-list">
            {listItems.map((listItem) => (
                <ListItem key={listItem.text} listItem={listItem} depth={0} />
            ))}
        </ul>
    );
};
