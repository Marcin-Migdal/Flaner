import { describe, expect, it } from "vitest";
import { navigation } from "./navigation";

describe("tools navigation", () => {
  it("generates root navigation item prefixed with /tools and spooler child", () => {
    expect(navigation).toBeDefined();
    expect(Array.isArray(navigation)).toBe(true);
    expect(navigation).toHaveLength(1);

    const rootNav = navigation[0];
    expect(rootNav.path).toBe("/tools");
    expect(rootNav.labelKey).toBe("nav.tools");
    expect(rootNav.icon).toBe("wrench");

    expect(rootNav.children).toBeDefined();
    expect(rootNav.children).toHaveLength(1);

    const spoolerNav = rootNav.children?.[0];
    expect(spoolerNav).toMatchObject({
      path: "/tools/spooler",
      labelKey: "nav.spooler",
      icon: "disc",
    });
  });
});
