import type { AppRouteObject } from "@flaner/shared/types";
import React from "react";
import { Outlet } from "react-router";

const FriendsView = React.lazy(() => import("./pages/FriendsView"));
const GroupsListView = React.lazy(() => import("./pages/groups/GroupsListView"));
const GroupDetailsView = React.lazy(() => import("./pages/groups/GroupDetailsView"));

export const routes: AppRouteObject[] = [
  {
    path: "",
    element: <Outlet />,
    handle: { label: "nav.community", icon: "users" },
    children: [
      {
        path: "friends",
        element: <FriendsView />,
        handle: {
          label: "nav.friends",
          icon: "users",
        },
      },
      {
        path: "groups",
        element: <GroupsListView />,
        handle: {
          label: "nav.groups",
          icon: "users",
        },
      },
      {
        path: "groups/:groupId",
        element: <GroupDetailsView />,
        handle: {
          hideInNav: true,
          label: "groupDetails",
          icon: "users",
        },
      },
    ],
  },
];
