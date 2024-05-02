import { useTranslation } from "react-i18next";
import { NavigateFunction, useNavigate } from "react-router-dom";

import { HeaderItems } from "../../interfaces";
import { ListItem } from "./components/ListItem";

import { useAppDispatch } from "@hooks/index";
import { signOut } from "@slices/authorization-slice";
import { NavigationNode, navigationTree } from "@utils/constants";

import "./styles.scss";

const mapNavigationTree = (t: (string: string) => string, navigate: NavigateFunction, navigationTree: NavigationNode[]): HeaderItems[] => {
    return navigationTree.map(({ path, subItems, ...other }) => {
        return { ...other, onClick: () => navigate(path), subItems: subItems ? mapNavigationTree(t, navigate, subItems) : [] };
    });
};

export const HeaderList = () => {
    const { t } = useTranslation(["header"]);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const handleSignOut = () => dispatch(signOut({ t: t }));

    const listItems: HeaderItems[] = [
        ...mapNavigationTree(t, navigate, navigationTree),
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
