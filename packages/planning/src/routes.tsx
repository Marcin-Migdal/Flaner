import React from "react";
import { Outlet } from "react-router";
import type { AppRouteObject } from "@flaner/shared/types";

const SchedulerView = React.lazy(() => import("./views/SchedulerView"));

export const routes: AppRouteObject[] = [
  {
    path: "",
    element: <Outlet />,
    handle: { label: "nav.planning", icon: "calendar" },
    children: [
      {
        path: "scheduling",
        element: <SchedulerView />,
        handle: {
          label: "nav.scheduling",
          icon: "calendar",
        },
      },
    ],
  },
];
