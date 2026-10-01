import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SplitGroupMember } from "../../../../../../hooks/useSplitGroupMembers";
import { ExpenseFilterPopover } from "./ExpenseFilterPopover";
import { DEFAULT_EXPENSE_FILTERS } from "./types";

const mockMembers: SplitGroupMember[] = [
  { id: "user-1", name: "Alice", avatarUrl: "", isCurrentUser: true },
  { id: "user-2", name: "Bob", avatarUrl: "", isCurrentUser: false },
];

let isMobileMock = false;

vi.mock("@flaner/shared/hooks", () => ({
  useIsMobile: () => isMobileMock,
}));

describe("ExpenseFilterPopover", () => {
  beforeEach(() => {
    isMobileMock = false;
  });

  it("renders trigger button and opens popover on click", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ExpenseFilterPopover
        filters={DEFAULT_EXPENSE_FILTERS}
        onApply={vi.fn()}
        members={mockMembers}
      />
    );

    const trigger = screen.getByRole("button", { name: "splits.filters.title" });
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);

    expect(screen.getByRole("button", { name: "splits.filters.apply" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "splits.filters.reset" })).toBeInTheDocument();
  });

  it("modifies filters and applies them", async () => {
    const user = userEvent.setup();
    const onApplyMock = vi.fn();

    renderWithProviders(
      <ExpenseFilterPopover
        filters={DEFAULT_EXPENSE_FILTERS}
        onApply={onApplyMock}
        members={mockMembers}
      />
    );

    const trigger = screen.getByRole("button", { name: "splits.filters.title" });
    await user.click(trigger);

    // 1. Search text
    const searchInput = screen.getByPlaceholderText("splits.filters.searchPlaceholder");
    await user.type(searchInput, "Dinner");

    // 2. Scope button
    const paidByMeBtn = screen.getByRole("button", { name: "splits.filters.scopePaidByMe" });
    await user.click(paidByMeBtn);

    // 3. Payer select
    const payerSelect = screen.getByLabelText("splits.filters.payer");
    await user.selectOptions(payerSelect, "user-1");

    // 4. Category select
    const categorySelect = screen.getByLabelText("splits.filters.category");
    await user.selectOptions(categorySelect, "food");

    // 5. Apply
    const applyBtn = screen.getByRole("button", { name: "splits.filters.apply" });
    await user.click(applyBtn);

    expect(onApplyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "Dinner",
        scope: "paid_by_me",
        payerId: "user-1",
        category: "food",
      }),
    );
  });

  it("resets draft when clicking reset button", async () => {
    const user = userEvent.setup();
    const onApplyMock = vi.fn();

    renderWithProviders(
      <ExpenseFilterPopover
        filters={{ ...DEFAULT_EXPENSE_FILTERS, query: "Old Query" }}
        onApply={onApplyMock}
        members={mockMembers}
      />
    );

    const trigger = screen.getByRole("button", { name: "splits.filters.title" });
    await user.click(trigger);

    const resetBtn = screen.getByRole("button", { name: "splits.filters.reset" });
    await user.click(resetBtn);

    const searchInput = screen.getByPlaceholderText("splits.filters.searchPlaceholder");
    expect(searchInput).toHaveValue("");
  });

  it("handles clearing dates from draft", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ExpenseFilterPopover
        filters={{
          ...DEFAULT_EXPENSE_FILTERS,
          dateFrom: "2026-10-01",
          dateTo: "2026-10-05",
        }}
        onApply={vi.fn()}
        members={mockMembers}
      />
    );

    const trigger = screen.getByRole("button", { name: "splits.filters.title" });
    await user.click(trigger);

    const clearBtns = screen.getAllByRole("button", { name: "splits.filters.clear" });
    expect(clearBtns.length).toBe(2);

    await user.click(clearBtns[0]);
    await user.click(clearBtns[1]);
  });

  it("renders mobile modal and handles escape and backdrop clicks", async () => {
    const user = userEvent.setup();
    isMobileMock = true;

    renderWithProviders(
      <ExpenseFilterPopover
        filters={DEFAULT_EXPENSE_FILTERS}
        onApply={vi.fn()}
        members={mockMembers}
      />
    );

    const trigger = screen.getByRole("button", { name: "splits.filters.title" });
    await user.click(trigger);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // Close button
    const closeBtn = screen.getByRole("button", { name: "splits.actions.cancel" });
    await user.click(closeBtn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Reopen and test Escape key
    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Reopen and test backdrop click
    await user.click(trigger);
    const backdrop = document.querySelector("[class*='mobileBackdrop']");
    if (backdrop) {
      await user.click(backdrop);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    }
  });
});
