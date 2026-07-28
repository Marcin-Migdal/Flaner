import type { RouteObject } from 'react-router';
import { Outlet } from 'react-router';

export const routes: RouteObject[] = [
  {
    path: "",
    element: <Outlet />,
    handle: { label: "nav.shopping", icon: "ShoppingBag" },
    children: []
  }
];
