import { describe, expect, it } from "vitest";
import { navigation } from "./navigation";

describe("community navigation", () => {
  it("generates root navigation item prefixed with /community and children", () => {
    expect(navigation).toBeDefined();
    expect(Array.isArray(navigation)).toBe(true);
    expect(navigation).toHaveLength(1);

    const rootNav = navigation[0];
    expect(rootNav.path).toBe("/community");
    expect(rootNav.labelKey).toBe("nav.community");
    expect(rootNav.icon).toBe("users");

    expect(rootNav.children).toBeDefined();
    expect(rootNav.children).toHaveLength(2);

    const childPaths = rootNav.children?.map((child) => child.path);
    expect(childPaths).toEqual(["/community/friends", "/community/groups"]);
  });

  it("contains appropriate label keys and icons for subroutes and excludes parameterized routes", () => {
    const rootNav = navigation[0];
    const friendsNav = rootNav.children?.find((item) => item.path === "/community/friends");
    expect(friendsNav).toMatchObject({
      path: "/community/friends",
      labelKey: "nav.friends",
      icon: "users",
    });

    const groupsNav = rootNav.children?.find((item) => item.path === "/community/groups");
    expect(groupsNav).toMatchObject({
      path: "/community/groups",
      labelKey: "nav.groups",
      icon: "users",
    });

    const detailNav = rootNav.children?.find((item) => item.path.includes(":groupId"));
    expect(detailNav).toBeUndefined();
  });
});
