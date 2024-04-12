import { NavigateFunction, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { ListItem } from "./components/ListItem";
import { HeaderItems } from "../../interfaces";

import { NavigationNode, navigationTree } from "@utils/constants";
import { signOut } from "@slices/authorization-slice";
import { useAppDispatch } from "@hooks/index";

import "./styles.scss";

const mapNavigationTree = (t: (string: string) => string, navigate: NavigateFunction, navigationTree: NavigationNode[]): HeaderItems[] => {
    return navigationTree.map(({ path, subItems, ...other }) => {
        return { ...other, onClick: () => navigate(path), subItems: subItems ? mapNavigationTree(t, navigate, subItems) : [] };
    });
};

export const HeaderList = () => {
    const navigate = useNavigate();
    const { t } = useTranslation(["header"]);
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
