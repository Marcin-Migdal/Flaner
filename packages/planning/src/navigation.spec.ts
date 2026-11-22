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
    expect(rootNav.children).toHaveLength(3);

    const childPaths = rootNav.children?.map((child) => child.path);
    expect(childPaths).toEqual(["/planning/scheduling", "/planning/splits", "/planning/budget"]);
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

  it("nests the four Budget views as a third level, labelled from the planning namespace", () => {
    const budgetNav = navigation[0].children?.find((item) => item.path === "/planning/budget");
    expect(budgetNav?.labelKey).toBe("planning:nav.budget");
    expect(budgetNav?.children?.map((item) => [item.path, item.labelKey])).toEqual([
      ["/planning/budget/summary", "planning:nav.budgetSummary"],
      ["/planning/budget/transactions", "planning:nav.budgetTransactions"],
      ["/planning/budget/planner", "planning:nav.budgetPlanner"],
      ["/planning/budget/settings", "planning:nav.budgetSettings"],
    ]);
  });
});
