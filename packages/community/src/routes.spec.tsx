import { describe, expect, it } from "vitest";
import { routes } from "./routes";

describe("community routes", () => {
  it("defines the root route with Outlet and handles", () => {
    expect(routes).toHaveLength(1);
    const rootRoute = routes[0];

    expect(rootRoute.path).toBe("");
    expect(rootRoute.element).toBeDefined();
    expect(rootRoute.handle).toEqual({
      label: "nav.community",
      icon: "users",
    });
  });

  it("defines child routes for friends, groups, and groupDetails", () => {
    const rootRoute = routes[0];
    const children = rootRoute.children;

    expect(children).toBeDefined();
    expect(children).toHaveLength(3);

    const friendsRoute = children?.[0];
    expect(friendsRoute?.path).toBe("friends");
    expect(friendsRoute?.element).toBeDefined();
    expect(friendsRoute?.handle).toEqual({
      label: "nav.friends",
      icon: "users",
    });

    const groupsRoute = children?.[1];
    expect(groupsRoute?.path).toBe("groups");
    expect(groupsRoute?.element).toBeDefined();
    expect(groupsRoute?.handle).toEqual({
      label: "nav.groups",
      icon: "users",
    });

    const groupDetailsRoute = children?.[2];
    expect(groupDetailsRoute?.path).toBe("groups/:groupId");
    expect(groupDetailsRoute?.element).toBeDefined();
    expect(groupDetailsRoute?.handle).toEqual({
      hideInNav: true,
      label: "groupDetails",
      icon: "users",
    });
  });
});
