import type { IconName } from "lucide-react/dynamic";
import type { RouteObject } from "react-router";

export type NavigationRouteHandle = {
  label?: string;
  icon?: IconName;
  hideInNav?: boolean;
};

export type AppRouteObject = Omit<RouteObject, "children" | "handle"> & {
  handle?: NavigationRouteHandle;
  children?: AppRouteObject[];
};

export type NavigationItem = {
  path: string;
  labelKey: string;
  icon: IconName;
  children?: NavigationItem[];
}
