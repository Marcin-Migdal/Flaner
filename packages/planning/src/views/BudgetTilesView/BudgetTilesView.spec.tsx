import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Route, Routes, useLocation } from "react-router";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
import type { AppRouteObject } from "@flaner/shared/types";
import { BudgetTilesView } from "./BudgetTilesView";

const i18n = createTestI18n({
  en: {
    planning: { nav: { budget: "Budget", budgetSummary: "Summary", budgetPlanner: "Planner" } },
  },
});

const views: AppRouteObject[] = [
  { path: "summary", handle: { label: "planning:nav.budgetSummary", icon: "chart-pie" } },
  { path: "planner", handle: { label: "planning:nav.budgetPlanner", icon: "list-checks" } },
];

const LocationProbe = () => <output>{useLocation().pathname}</output>;

describe("BudgetTilesView", () => {
  it("shows a tile per Budget view and opens it", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Routes>
        <Route path="/planning/budget">
          <Route index element={<BudgetTilesView routes={views} />} />
          <Route path="*" element={<LocationProbe />} />
        </Route>
      </Routes>,
      { i18nInstance: i18n, initialEntries: ["/planning/budget"] },
    );

    expect(screen.getByRole("heading", { level: 1, name: "Budget" })).toBeInTheDocument();
    expect(screen.getAllByRole("button").map((tile) => tile.textContent)).toEqual(["Summary", "Planner"]);

    await user.click(screen.getByRole("button", { name: "Planner" }));

    expect(screen.getByRole("status")).toHaveTextContent("/planning/budget/planner");
  });
});
