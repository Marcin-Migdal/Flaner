import { describe, expect, it } from "vitest";
import { routes } from "./routes";

describe("settings routes", () => {
  it("defines root route with Outlet and hideInNav handle", () => {
    expect(routes).toHaveLength(1);
    const rootRoute = routes[0];

    expect(rootRoute.path).toBe("");
    expect(rootRoute.element).toBeDefined();
    expect(rootRoute.handle).toEqual({
      label: "nav.settings",
      icon: "settings",
      hideInNav: true,
    });
  });
});
