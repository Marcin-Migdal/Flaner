import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
import { BudgetMonthSwitcher } from "./BudgetMonthSwitcher";

const i18n = createTestI18n({
  en: {
    planning: {
      budget: {
        monthSwitcher: {
          previous: "Previous month",
          next: "Next month",
          pick: "Pick a month",
          previousYear: "Previous year",
          nextYear: "Next year",
        },
      },
    },
  },
});

const renderSwitcher = (month: string) => {
  const onChange = vi.fn();
  renderWithProviders(<BudgetMonthSwitcher month={month} onChange={onChange} />, { i18nInstance: i18n });
  return { onChange };
};

describe("BudgetMonthSwitcher", () => {
  it("shows the month and steps across year boundaries with the arrows", async () => {
    const user = userEvent.setup();
    const { onChange } = renderSwitcher("2026-01");

    expect(screen.getByRole("button", { name: "Pick a month" })).toHaveTextContent("January 2026");
    await user.click(screen.getByRole("button", { name: "Previous month" }));
    await user.click(screen.getByRole("button", { name: "Next month" }));

    expect(onChange.mock.calls).toEqual([["2025-12"], ["2026-02"]]);
  });

  it("picks any month of any year", async () => {
    const user = userEvent.setup();
    const { onChange } = renderSwitcher("2026-11");

    await user.click(screen.getByRole("button", { name: "Pick a month" }));
    expect(screen.getByRole("button", { name: "Nov" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Next year" }));
    await user.click(screen.getByRole("button", { name: "Mar" }));

    expect(onChange).toHaveBeenCalledWith("2027-03");
  });
});
