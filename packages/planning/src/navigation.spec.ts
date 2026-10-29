import { describe, expect, it } from "vitest";
import { navigation } from "./navigation";

describe("planning navigation", () => {
  it("generates root navigation item prefixed with /planning and nested children", () => {
    expect(navigation).toBeDefined();
    expect(Array.isArray(navigation)).toBe(true);
    expect(navigation).toHaveLength(1);

    const rootNav = navigation[0];
    expect(rootNav.path).toBe("/planning");
    expect(rootNav.labelKey).toBe("nav.planning");
    expect(rootNav.icon).toBe("calendar");

    expect(rootNav.children).toBeDefined();
    expect(rootNav.children).toHaveLength(2);

    const childPaths = rootNav.children?.map((child) => child.path);
    expect(childPaths).toEqual(["/planning/scheduling", "/planning/splits"]);
  });

  it("contains appropriate label keys and icons for subroutes", () => {
    const rootNav = navigation[0];
    const schedulingNav = rootNav.children?.find((item) => item.path === "/planning/scheduling");
    expect(schedulingNav).toMatchObject({
      path: "/planning/scheduling",
      labelKey: "nav.scheduling",
      icon: "calendar",
    });

    const splitsNav = rootNav.children?.find((item) => item.path === "/planning/splits");
    expect(splitsNav).toMatchObject({
      path: "/planning/splits",
      labelKey: "nav.splits",
      icon: "wallet",
    });
  });
});
