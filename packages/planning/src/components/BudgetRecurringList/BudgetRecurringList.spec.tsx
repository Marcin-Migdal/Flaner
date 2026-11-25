import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
import en from "../../../public/locales/en/planning.json";
import type { BudgetAccount, BudgetCategoryTree, BudgetRecurring } from "../../api/budget";
import { BudgetRecurringList, type BudgetRecurringListProps } from "./BudgetRecurringList";

const i18n = createTestI18n({ en: { planning: en } });

const accounts: BudgetAccount[] = [{ id: "main", name: "mBank", defaultCurrency: "PLN", hidden: false, createdAt: 1 }];
const categories: BudgetCategoryTree = {
  expense: [{ id: "home", name: "Home", icon: "house", color: 2, subcategories: [{ id: "rent", name: "Rent" }] }],
  income: [{ id: "salary", name: "Salary", icon: "wallet", color: 3, subcategories: [] }],
};

const recurring = (overrides: Partial<BudgetRecurring>): BudgetRecurring => ({
  id: "rent",
  accountId: "main",
  type: "expense",
  payee: "Landlord",
  categoryId: "rent",
  amount: 250000,
  currency: "PLN",
  amountMain: 250000,
  rule: { pattern: { frequency: "monthly", interval: 1, day: 10 }, start: "2026-09-10", end: { type: "never" } },
  occurrences: {
    "2026-10-10": { transactionId: "oct", date: "2026-10-09", amount: 260000, amountMain: 260000 },
  },
  createdAt: 1,
  ...overrides,
});

const list = [
  recurring({}),
  recurring({
    id: "gym",
    payee: "Gym",
    amount: 9900,
    amountMain: 9900,
    rule: { pattern: { frequency: "weekly", interval: 2, weekdays: [1, 4] }, start: "2026-11-02", end: { type: "until", date: "2026-12-31" } },
    occurrences: {},
  }),
  recurring({
    id: "salary",
    type: "income",
    payee: "Employer",
    categoryId: "salary",
    amount: 800000,
    amountMain: 800000,
    rule: { pattern: { frequency: "monthly", interval: 1, day: "last" }, start: "2026-09-30", end: { type: "never" } },
    occurrences: {},
  }),
];

const renderList = (props: Partial<BudgetRecurringListProps> = {}) =>
  renderWithProviders(
    <BudgetRecurringList
      recurring={list}
      categories={categories}
      accounts={accounts}
      mainCurrency="PLN"
      today="2026-11-12"
      {...props}
    />,
    { i18nInstance: i18n },
  );

describe("BudgetRecurringList", () => {
  it("groups Expenses and Income with this month's sum, rule, next due date, expected amount and status", () => {
    renderList();

    const expenses = screen.getByRole("region", { name: "Expenses" });
    // Rent overdue on 10 November at the last paid 2,600.00; Gym on 2, 5, 16, 19 and 30 Nov at 99.00 each
    expect(within(expenses).getByText("This month: -PLN 3,095.00")).toBeInTheDocument();
    const rent = within(expenses).getByRole("button", { name: /Landlord/ });
    expect(rent).toHaveTextContent("Rent · Every month on day 10");
    // 10 November is unpaid: the row says since when, not the next date ahead
    expect(rent).toHaveTextContent("Overdue since Nov 10, 2026");
    expect(rent).not.toHaveTextContent("Next:");
    expect(rent).toHaveTextContent("-PLN 2,600.00");
    expect(rent).toHaveTextContent("Overdue");
    expect(within(expenses).getByRole("button", { name: /Gym/ })).toHaveTextContent(
      "Every 2 weeks on Mon, Thu, until Dec 31, 2026",
    );

    const income = screen.getByRole("region", { name: "Income" });
    expect(within(income).getByText("This month: PLN 8,000.00")).toBeInTheDocument();
    expect(within(income).getByRole("button", { name: /Employer/ })).toHaveTextContent("Upcoming");
  });

  it("expands a row into its occurrences with the matched transaction, and its actions", async () => {
    const user = userEvent.setup();
    const onEditRule = vi.fn();
    const onStop = vi.fn();
    const onDelete = vi.fn();
    renderList({ onEditRule, onStop, onDelete });

    await user.click(screen.getByRole("button", { name: /Landlord/ }));
    const occurrences = screen.getAllByRole("listitem").filter((item) => item.textContent?.includes("2026") && !item.querySelector("button"));
    expect(occurrences.map((item) => item.textContent?.replace(/\s/g, " "))).toEqual([
      "Dec 10, 2026Upcoming",
      "Nov 10, 2026Overdue",
      "Oct 10, 2026-PLN 2,600.00 on Oct 9, 2026Paid",
      "Sep 10, 2026Overdue",
    ]);

    await user.click(screen.getByRole("button", { name: "Edit rule" }));
    await user.click(screen.getByRole("button", { name: "Stop" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onEditRule).toHaveBeenCalledWith(expect.objectContaining({ id: "rent" }));
    expect(onStop).toHaveBeenCalledWith(expect.objectContaining({ id: "rent" }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "rent" }));
  });

  it("shows the next due date when nothing is overdue", () => {
    const paidNovember = recurring({
      occurrences: {
        "2026-10-10": { transactionId: "oct", date: "2026-10-09", amount: 260000, amountMain: 260000 },
        "2026-11-10": { transactionId: "nov", date: "2026-11-10", amount: 260000, amountMain: 260000 },
      },
    });
    renderList({ recurring: [paidNovember] });

    const rent = screen.getByRole("button", { name: /Landlord/ });
    expect(rent).toHaveTextContent("Next: Dec 10, 2026");
    expect(rent).toHaveTextContent("Paid");
    expect(rent).not.toHaveTextContent("Overdue");
  });

  it("shows an ended recurring transaction without Stop", async () => {
    const user = userEvent.setup();
    renderList({ recurring: [list[1]], today: "2027-01-05", onStop: vi.fn() });

    const gym = screen.getByRole("button", { name: /Gym/ });
    expect(gym).toHaveTextContent("Ended");
    await user.click(gym);
    expect(screen.queryByRole("button", { name: "Stop" })).not.toBeInTheDocument();
  });
});
