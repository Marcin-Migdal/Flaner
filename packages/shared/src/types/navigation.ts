import type { RouteObject } from "react-router";

// Icons the host can render in navigation. A static list (not lucide's DynamicIcon) keeps ~1900 icon chunks
// out of the build and the PWA precache; a remote that needs a new icon adds it here and in ui-components' NavIcon.
export type NavIconName =
  | "arrow-left-right"
  | "calendar"
  | "chart-pie"
  | "disc"
  | "home"
  | "list-checks"
  | "piggy-bank"
  | "settings"
  | "shopping-bag"
  | "users"
  | "wallet"
  | "wrench";

export type NavigationRouteHandle = {
  label?: string;
  icon?: NavIconName;
  hideInNav?: boolean;
};

// Stays a RouteObject (no Omit), so arrays of it go straight into useRoutes / createBrowserRouter
export type AppRouteObject = RouteObject & {
  handle?: NavigationRouteHandle;
  children?: AppRouteObject[];
};

export type NavigationItem = {
  path: string;
  labelKey: string;
  /** Always set on top-level items (`generateNavigation` requires it there); optional below. */
  icon?: NavIconName;
  children?: NavigationItem[];
}
