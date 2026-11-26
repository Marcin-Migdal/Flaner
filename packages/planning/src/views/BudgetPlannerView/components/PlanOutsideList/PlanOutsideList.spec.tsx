import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
import en from "../../../../../public/locales/en/planning.json";
import type { BudgetCategory } from "../../../../api/budget";
import type { OutsideRow } from "../../../../utils/plannerMonth";
import { PlanOutsideList } from "./PlanOutsideList";

const i18n = createTestI18n({ en: { planning: en } });

const shopping: BudgetCategory = {
  id: "shopping",
  name: "Shopping",
  icon: "shopping-bag",
  color: 1,
  subcategories: [{ id: "hobbies", name: "Hobbies" }],
};
const row = (overrides: Partial<OutsideRow>): OutsideRow => ({
  id: "shopping",
  category: shopping,
  subcategory: null,
  spent: 4500,
  transactions: [],
  recurring: [],
  recurringPaid: 0,
  recurringExpected: 0,
  ...overrides,
});
const rows: OutsideRow[] = [
  row({}),
  row({ id: "hobbies", subcategory: shopping.subcategories[0] }),
  row({ id: null, category: null, spent: 3000 }),
];

const renderList = (type: "expense" | "income", onAdd = vi.fn()) =>
  renderWithProviders(
    <PlanOutsideList rows={rows} type={type} mainCurrency="PLN" month="2026-11" onAdd={onAdd} onOpen={vi.fn()} />,
    { i18nInstance: i18n },
  );

describe("PlanOutsideList", () => {
  it("names every Add limit button after its category", async () => {
    const onAdd = vi.fn();
    const userEvents = userEvent.setup();
    renderList("expense", onAdd);

    expect(screen.getByRole("button", { name: "Add limit: Shopping" })).toBeInTheDocument();
    await userEvents.click(screen.getByRole("button", { name: "Add limit: Shopping / Hobbies" }));

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: "hobbies" }));
  });

  it("names Add planned income buttons after their category on the income side", () => {
    renderList("income");

    expect(screen.getByRole("button", { name: "Add planned income: Shopping / Hobbies" })).toBeInTheDocument();
  });

  it("opens Uncategorized in Transactions for the same month, filtered to uncategorized rows of the section's type", () => {
    const { unmount } = renderList("expense");
    expect(screen.getByRole("link", { name: "Review in Transactions" })).toHaveAttribute(
      "href",
      "/transactions?month=2026-11&categories=uncategorized&direction=expense",
    );
    unmount();

    renderList("income");
    expect(screen.getByRole("link", { name: "Review in Transactions" })).toHaveAttribute(
      "href",
      "/transactions?month=2026-11&categories=uncategorized&direction=income",
    );
  });
});
