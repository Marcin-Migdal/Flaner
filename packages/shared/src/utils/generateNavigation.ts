import type { AppRouteObject, NavigationItem } from "../types/navigation";

export function generateNavigation(routes: AppRouteObject[], basePath: string): NavigationItem[] {
  const items: NavigationItem[] = [];

  for (const route of routes) {
    if (route.handle?.hideInNav === true) continue;
    if (route.path && route.path.includes(":")) continue;

    const fullPath = route.path ? (route.path.startsWith("/") ? route.path : `${basePath}/${route.path}`) : basePath;
    const cleanPath = fullPath.replace(/\/+/g, "/").replace(/\/$/, ""); // cleanup double slashes and trailing slashes

    const handle = route.handle;
    if (handle?.label && handle?.icon) {
      const item: NavigationItem = {
        path: cleanPath,
        labelKey: handle.label,
        icon: handle.icon,
      };

      if (route.children && route.children.length > 0) {
        const children = generateNavigation(route.children, cleanPath);
        if (children.length > 0) {
          item.children = children;
        }
      }

      items.push(item);
    } else if (route.children) {
      const children = generateNavigation(route.children, cleanPath);
      items.push(...children);
    }
  }

  return items;
}
