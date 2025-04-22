import { IconProp } from "@fortawesome/fontawesome-svg-core";

import { PATH_CONSTRANTS } from "@utils/enums";

export type NavigationNode = {
  text: string;
  path: PATH_CONSTRANTS;
  icon?: IconProp;
  disabled?: boolean;
  subItems?: NavigationNode[];
};

export const navigationTree: NavigationNode[] = [
  {
    text: "Community",
    path: PATH_CONSTRANTS.COMMUNITY,
    icon: ["fas", "person"],
    subItems: [
      {
        text: "Add friends",
        path: PATH_CONSTRANTS.ADD_FRIENDS,
        icon: ["fas", "plus"],
      },
      {
        text: "My friends",
        path: PATH_CONSTRANTS.MY_FRIENDS,
        icon: ["fas", "person"],
      },
      {
        text: "Groups",
        path: PATH_CONSTRANTS.GROUPS,
        icon: ["fas", "people-group"],
      },
    ],
  },
  {
    text: "Planning",
    path: PATH_CONSTRANTS.PLANNING,
    icon: ["fas", "layer-group"],
    subItems: [
      {
        text: "To Do",
        path: PATH_CONSTRANTS.TODO,
        icon: ["fas", "list"],
      },
      {
        text: "Shopping",
        path: PATH_CONSTRANTS.SHOPPING_LISTS,
        icon: ["fas", "cart-shopping"],
      },
      {
        text: "Planning settings",
        path: PATH_CONSTRANTS.PLANNING_SETTINGS,
        icon: ["fas", "drumstick-bite"],
        subItems: [
          {
            text: "Products",
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
