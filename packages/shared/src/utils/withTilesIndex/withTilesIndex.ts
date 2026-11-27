import type { ReactNode } from "react";
import type { AppRouteObject } from "../../types/navigation";

export type TilesIndexProps = {
  /** The parent route's label (translation key, may be `ns:key`): the tiles page title. */
  label: string;
  /** The parent route's children: one tile per labelled one. */
  routes: AppRouteObject[];
};

/**
 * Gives every labelled route with children a tiles landing page (spec #167): an index route rendering
 * `renderTiles({ label, routes })`. A route that declares its own index route keeps it (the opt-out). Applies at every depth.
 */
export function withTilesIndex(
  routes: AppRouteObject[],
  renderTiles: (tiles: TilesIndexProps) => ReactNode,
): AppRouteObject[] {
  return routes.map((route) => {
    if (!route.children?.length) return route;

    const children = withTilesIndex(route.children, renderTiles);
    const label = route.handle?.label;
    if (!label || children.some((child) => child.index)) return { ...route, children };

    return {
      ...route,
      children: [{ index: true, element: renderTiles({ label, routes: children }) }, ...children],
    };
  });
}
