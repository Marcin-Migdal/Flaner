import { HeaderItem } from "@components/Layout/MainLayout/components/Header/interfaces";
import { NavigationNode } from "@utils/constants";
import { NavigateFunction } from "react-router-dom";

export const mapNavigationTree = (
    t: (string: string) => string,
    navigate: NavigateFunction,
    navigationTree: NavigationNode[]
): HeaderItem[] => {
    return navigationTree.map(({ path, subItems, ...other }) => {
        return { ...other, onClick: () => navigate(path), subItems: subItems ? mapNavigationTree(t, navigate, subItems) : [] };
    });
};
