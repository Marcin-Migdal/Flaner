import { NavigateFunction } from "react-router-dom";

import { HeaderItem } from "@components";

import { NavigationNode } from "../constants";

export const mapNavigationTree = (
  t: (string: string) => string,
  navigate: NavigateFunction,
  navigationTree: NavigationNode[]
): HeaderItem[] => {
  return navigationTree.map(({ path, subItems, ...other }) => {
    return {
      ...other,
      onClick: () => navigate(path),
      subItems: subItems ? mapNavigationTree(t, navigate, subItems) : [],
    };
  });
};
