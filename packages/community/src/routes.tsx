import React from "react";
import type { RouteObject } from "react-router";
import { Outlet } from "react-router";

const FriendsView = React.lazy(() => import("./pages/FriendsView"));
const GroupsListView = React.lazy(() => import("./pages/groups/GroupsListView"));
const GroupDetailsView = React.lazy(() => import("./pages/groups/GroupDetailsView"));

export const routes: RouteObject[] = [
  {
    path: "",
    element: <Outlet />,
    handle: { label: "nav.community", icon: "Users" },
    children: [
      {
        path: "friends",
        element: <FriendsView />,
        handle: {
          label: "nav.friends",
          icon: "Users",
        },
      },
      {
        path: "groups",
        element: <GroupsListView />,
        handle: {
          label: "nav.groups",
          icon: "Users",
        },
      },
      {
        path: "groups/:groupId",
        element: <GroupDetailsView />,
        handle: {
          hideInNav: true,
          label: "groupDetails",
          icon: "Users",
        },
      },
    ],
  },
];
