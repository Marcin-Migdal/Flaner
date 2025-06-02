import { IconProp } from "@fortawesome/fontawesome-svg-core";

import { PATH_CONSTRANTS } from "../enums";

export type NavigationNode = {
  text: string;
  path: PATH_CONSTRANTS;
  icon?: IconProp;
  disabled?: boolean;
  subItems?: NavigationNode[];
};

export const navigationTree: NavigationNode[] = [
  {
    text: "nav.main.community",
    path: PATH_CONSTRANTS.COMMUNITY,
    icon: ["fas", "person"],
    subItems: [
      {
        text: "friends.add",
        path: PATH_CONSTRANTS.ADD_FRIENDS,
        icon: ["fas", "plus"],
      },
      {
        text: "friends.myFriends",
        path: PATH_CONSTRANTS.MY_FRIENDS,
        icon: ["fas", "person"],
      },
      {
        text: "nav.planning.groups",
        path: PATH_CONSTRANTS.GROUPS,
        icon: ["fas", "people-group"],
      },
    ],
  },
  {
    text: "nav.main.planning",
    path: PATH_CONSTRANTS.PLANNING,
    icon: ["fas", "layer-group"],
    subItems: [
      {
        text: "nav.planning.shopping",
        path: PATH_CONSTRANTS.SHOPPING_LISTS,
        icon: ["fas", "cart-shopping"],
      },
      {
        text: "nav.planning.settings",
        path: PATH_CONSTRANTS.PLANNING_SETTINGS,
        icon: ["fas", "drumstick-bite"],
        subItems: [
          {
            text: "nav.planning.products",
            path: PATH_CONSTRANTS.PRODUCTS,
            icon: ["fas", "drumstick-bite"],
          },
        ],
      },
    ],
  },
];

export const getNodeByPath = (path: PATH_CONSTRANTS): NavigationNode[] => {
  const matchingNodes: NavigationNode[] = [];

  const traverseTree = (nodes: NavigationNode[]) => {
    for (const node of nodes) {
      if (node.path === path) {
        matchingNodes.push(node);
      }
      if (node.subItems && node.subItems.length > 0) {
        traverseTree(node.subItems);
      }
    }
  };

  traverseTree(navigationTree);

  return matchingNodes;
};
