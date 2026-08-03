import type { AppRouteObject } from "@flaner/shared/types";
import { Outlet } from 'react-router';

export const routes: AppRouteObject[] = [
  {
    path: "",
    element: <Outlet />,
    handle: { label: "nav.shopping", icon: "shopping-bag" },
    children: []
  }
];
