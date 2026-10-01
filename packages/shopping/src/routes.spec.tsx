import { describe, expect, it } from "vitest";
import { routes } from "./routes";

describe("shopping routes", () => {
  it("defines root route with Outlet and handles", () => {
    expect(routes).toHaveLength(1);
    const rootRoute = routes[0];

    expect(rootRoute.path).toBe("");
    expect(rootRoute.element).toBeDefined();
    expect(rootRoute.handle).toEqual({
      label: "nav.shopping",
      icon: "shopping-bag",
    });
  });
});
