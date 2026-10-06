import { describe, expect, it } from "vitest";
import { routes } from "./routes";

describe("tools routes", () => {
  it("defines the root route with Outlet and handle", () => {
    expect(routes).toHaveLength(1);
    const rootRoute = routes[0];

    expect(rootRoute.path).toBe("");
    expect(rootRoute.element).toBeDefined();
    expect(rootRoute.handle).toEqual({
      label: "nav.tools",
      icon: "wrench",
    });
  });

  it("defines spooler child route and default redirect", () => {
    const rootRoute = routes[0];
    const children = rootRoute.children;

    expect(children).toBeDefined();
    expect(children).toHaveLength(2);

    const spoolerRoute = children?.[0];
    expect(spoolerRoute?.path).toBe("spooler");
    expect(spoolerRoute?.element).toBeDefined();
    expect(spoolerRoute?.handle).toEqual({
      label: "nav.spooler",
      icon: "disc",
    });

    const defaultRoute = children?.[1];
    expect(defaultRoute?.path).toBe("");
    expect(defaultRoute?.element).toBeDefined();
  });
});
