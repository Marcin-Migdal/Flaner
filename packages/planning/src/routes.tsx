import { Outlet } from "react-router";
import type { AppRouteObject } from "@flaner/shared/types";
import { SchedulerView } from "./views/SchedulerView";

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
