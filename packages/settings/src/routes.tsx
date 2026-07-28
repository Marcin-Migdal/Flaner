import type { RouteObject } from "react-router";
import { Outlet } from "react-router";

export const routes: RouteObject[] = [
  {
    path: "",
    element: <Outlet />,
    handle: { label: "nav.settings", icon: "Settings", hideInNav: true },
    children: [],
  },
];
