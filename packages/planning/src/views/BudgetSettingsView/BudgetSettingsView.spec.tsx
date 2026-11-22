import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
import { BudgetSettingsView } from "./BudgetSettingsView";

const i18n = createTestI18n({
  en: {
    planning: {
      nav: { budgetSettings: "Settings" },
      budget: { settings: { tabs: { accounts: "Accounts & security", categories: "Categories", rules: "Rules" } } },
    },
  },
});

const renderView = (entry: string) =>
  renderWithProviders(<BudgetSettingsView />, { i18nInstance: i18n, initialEntries: [entry] });

describe("BudgetSettingsView", () => {
  it("shows the three tabs with Accounts & security first", () => {
    renderView("/planning/budget/settings");

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Accounts & security",
      "Categories",
      "Rules",
    ]);
    expect(screen.getByRole("tab", { name: "Accounts & security" })).toHaveAttribute("aria-selected", "true");
  });

  it.each([
    ["#categories", "Categories"],
    ["#rules", "Rules"],
    ["#unknown", "Accounts & security"],
  ])("opens the tab for %s", (hash, tabName) => {
    renderView(`/planning/budget/settings${hash}`);

    expect(screen.getByRole("tab", { name: tabName })).toHaveAttribute("aria-selected", "true");
  });
});
