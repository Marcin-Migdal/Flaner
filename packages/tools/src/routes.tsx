import type { AppRouteObject } from "@flaner/shared/types";
import React from "react";
import { Navigate, Outlet } from "react-router";

const SpoolerView = React.lazy(() => import("./pages/SpoolerView"));

export const routes: AppRouteObject[] = [
  {
    path: "",
    element: <Outlet />,
    handle: { label: "nav.tools", icon: "wrench" },
    children: [
      {
        path: "spooler",
        element: <SpoolerView />,
        handle: {
          label: "nav.spooler",
          icon: "disc",
        },
      },
      {
        path: "",
        element: <Navigate to="spooler" replace />,
      },
    ],
  },
];
