import { describe, expect, it } from "vitest";
import { routes } from "./routes";

describe("planning routes", () => {
  it("defines the root route with Outlet and handles", () => {
    expect(routes).toHaveLength(1);
    const rootRoute = routes[0];

    expect(rootRoute.path).toBe("");
    expect(rootRoute.element).toBeDefined();
    expect(rootRoute.handle).toEqual({
      label: "nav.planning",
      icon: "calendar",
    });
  });

  it("defines child routes for scheduling, splits and budget with correct configuration", () => {
    const rootRoute = routes[0];
    const children = rootRoute.children;

    expect(children).toBeDefined();
    expect(children).toHaveLength(3);

    const schedulingRoute = children?.[0];
    expect(schedulingRoute?.path).toBe("scheduling");
    expect(schedulingRoute?.element).toBeDefined();
    expect(schedulingRoute?.handle).toEqual({
      label: "nav.scheduling",
      icon: "calendar",
    });

    const splitsRoute = children?.[1];
    expect(splitsRoute?.path).toBe("splits");
    expect(splitsRoute?.element).toBeDefined();
    expect(splitsRoute?.handle).toEqual({
      label: "nav.splits",
      icon: "wallet",
    });
  });

  it("defines the Budget route with a tiles index page and four lazy views", () => {
    const budgetRoute = routes[0].children?.[2];
    expect(budgetRoute?.path).toBe("budget");
    expect(budgetRoute?.handle).toEqual({ label: "planning:nav.budget", icon: "piggy-bank" });

    const [indexRoute, ...views] = budgetRoute?.children ?? [];
    expect(indexRoute.index).toBe(true);
    expect(indexRoute.element).toBeDefined();
    expect(views.map((view) => [view.path, view.handle?.label])).toEqual([
      ["summary", "planning:nav.budgetSummary"],
      ["transactions", "planning:nav.budgetTransactions"],
      ["planner", "planning:nav.budgetPlanner"],
      ["settings", "planning:nav.budgetSettings"],
    ]);
  });
});
