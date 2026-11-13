import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@flaner/test-utils";
import { router } from "./router";

vi.mock("../../mf", () => ({
  lazyMfeRoutes: vi.fn(),
  lazyProvider: vi.fn(() => () => <div data-testid="mock-mfe" />),
}));

describe("router", () => {
  it("initializes router with public, protected, and catch-all routes", () => {
    expect(router).toBeDefined();
    expect(router.routes).toBeDefined();
    expect(router.routes.length).toBeGreaterThanOrEqual(3);

    // Public routes (login)
    const publicRoute = router.routes[0];
    expect(publicRoute.children?.some((c) => c.path === "/login")).toBe(true);

    // Protected routes (ShellLayout + home + MFE subroutes)
    const protectedRoute = router.routes[1];
    expect(protectedRoute.children).toBeDefined();

    // Catch-all
    const catchAllRoute = router.routes[router.routes.length - 1];
    expect(catchAllRoute.path).toBe("*");
  });

  it("mounts every MFE from the registry: tiles page (except settings) and splat route", () => {
    const mfeGroup = router.routes[1].children?.[0].children?.[1];
    expect(mfeGroup?.errorElement).toBeDefined();
    expect(mfeGroup?.children?.map((r) => r.path)).toEqual([
      "/settings/*",
      "/community",
      "/community/*",
      "/shopping",
      "/shopping/*",
      "/planning",
      "/planning/*",
      "/tools",
      "/tools/*",
    ]);
    // community mounts `./routes` via `lazy`, the rest render `./App` as an element
    const splats = mfeGroup?.children?.filter((r) => r.path?.endsWith("/*"));
    expect(splats?.filter((r) => !r.element).map((r) => r.path)).toEqual(["/community/*"]);
  });

  it("renders withSuspense wrapped MFE components", () => {
    type RouteItem = { path?: string; element?: React.ReactNode; children?: RouteItem[] };
    const findSuspenseRoute = (routes: RouteItem[]): RouteItem | undefined => {
      for (const r of routes) {
        if (r.path?.endsWith("/*") && r.element) return r;
        if (r.children) {
          const found = findSuspenseRoute(r.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    const targetRoute = findSuspenseRoute(router.routes as RouteItem[]);
    expect(targetRoute).toBeDefined();

    if (targetRoute?.element) {
      const { container } = renderWithProviders(targetRoute.element as React.ReactElement);
      expect(container).toBeDefined();
    }
  });
});
