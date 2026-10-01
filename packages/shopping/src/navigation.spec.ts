import { describe, expect, it } from "vitest";
import { navigation } from "./navigation";

describe("shopping navigation", () => {
  it("generates root navigation item prefixed with /shopping", () => {
    expect(navigation).toBeDefined();
    expect(Array.isArray(navigation)).toBe(true);
    expect(navigation).toHaveLength(1);

    const rootNav = navigation[0];
    expect(rootNav.path).toBe("/shopping");
    expect(rootNav.labelKey).toBe("nav.shopping");
    expect(rootNav.icon).toBe("shopping-bag");
  });
});
