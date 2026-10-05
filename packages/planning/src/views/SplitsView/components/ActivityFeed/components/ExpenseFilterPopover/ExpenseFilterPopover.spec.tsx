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

    // Reopen and test backdrop click with open datepicker
    await user.click(trigger);
    const datePickers = screen.getAllByRole("button", { name: /datePicker\.selectDate/ });
    if (datePickers[0]) {
      await user.click(datePickers[0]); // opens dateFrom
    }
    const backdrop = document.querySelector<HTMLDivElement>("div[aria-hidden='true'].fixed.inset-0");
    expect(backdrop).toBeTruthy();
    if (backdrop) {
      await user.click(backdrop); // closes dateFrom without closing dialog
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      await user.click(backdrop); // closes dialog
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    }
  });

  it("handles dateTo selection from date picker", async () => {
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

    const datePickers = screen.getAllByRole("button", { name: /datePicker\.selectDate/ });
    if (datePickers[1]) {
      await user.click(datePickers[1]); // open dateTo calendar
      let dayButtons = screen.getAllByRole("button");
      let day15 = dayButtons.find((btn) => btn.textContent?.trim() === "15");
      if (day15) {
        await user.click(day15);
      }

      // Re-click dateTo button using dateField container to select the same date (duplicate date check)
      const dateFields = document.querySelectorAll("[class*='dateField']");
      const dateToButton = dateFields[1]?.querySelector("button");
      if (dateToButton) {
        await user.click(dateToButton);
        dayButtons = screen.getAllByRole("button");
        day15 = dayButtons.find((btn) => btn.textContent?.trim() === "15");
        if (day15) {
          await user.click(day15);
        }
      }

      // Test clear dateTo button
      const clearDateToBtn = screen.getByRole("button", { name: "splits.filters.clear" });
      await user.click(clearDateToBtn);
    }

    const applyBtn = screen.getByRole("button", { name: "splits.filters.apply" });
    await user.click(applyBtn);

    expect(onApplyMock).toHaveBeenCalled();
  });

  it("handles duplicate dateTo selection when date is already set", async () => {
    const user = userEvent.setup();
    const onApplyMock = vi.fn();

    renderWithProviders(
      <ExpenseFilterPopover
        filters={{ ...DEFAULT_EXPENSE_FILTERS, dateTo: "2026-06-15" }}
        onApply={onApplyMock}
        members={mockMembers}
      />
    );

    const trigger = screen.getByRole("button", { name: "splits.filters.title" });
    await user.click(trigger);

    // dateTo button shows 15.06.2026
    const dateFields = document.querySelectorAll("[class*='dateField']");
    const dateToBtn = dateFields[1]?.querySelector("button[class*='datePickerButton']");
    if (dateToBtn) {
      await user.click(dateToBtn);
      const dayButtons = screen.getAllByRole("button");
      const day15 = dayButtons.find((btn) => btn.textContent?.trim() === "15");
      if (day15) {
        await user.click(day15);
      }
    }
  });

  it("handles active filters badge, earlier dateTo reset, clear dateFrom, and mobile close button", async () => {
    const user = userEvent.setup();
    const onApplyMock = vi.fn();

    // Render with active filters
    const activeFilters = {
      ...DEFAULT_EXPENSE_FILTERS,
      dateFrom: "2026-06-10",
      dateTo: "2026-06-12",
      scope: "all" as const,
    };

    renderWithProviders(
      <ExpenseFilterPopover
        filters={activeFilters}
        onApply={onApplyMock}
        members={mockMembers}
      />
    );

    const trigger = screen.getByRole("button", { name: "splits.filters.title" });
    await user.click(trigger);

    // Clear dateFrom button
    const clearButtons = screen.getAllByRole("button", { name: "splits.filters.clear" });
    if (clearButtons[0]) {
      await user.click(clearButtons[0]);
    }

    // Now test in mobile mode with fresh render
    isMobileMock = true;
    renderWithProviders(
      <ExpenseFilterPopover
        filters={activeFilters}
        onApply={onApplyMock}
        members={mockMembers}
      />
    );

    // Click mobile trigger
    const mobileTriggers = screen.getAllByRole("button", { name: "splits.filters.title" });
    const mobileTrigger = mobileTriggers[mobileTriggers.length - 1];
    await user.click(mobileTrigger);

    // Click close X button in mobile header
    const closeBtn = screen.getByRole("button", { name: "splits.actions.cancel" });
    await user.click(closeBtn);

    // Reopen and test backdrop click with datePicker open
    await user.click(mobileTrigger);
    const datePickers = screen.getAllByRole("button", { name: /datePicker\.selectDate|10\.06\.2026|12\.06\.2026/ });
    if (datePickers[0]) {
      await user.click(datePickers[0]); // open dateFrom calendar
    }
    const backdrop = document.querySelector("[class*='mobileBackdrop']");
    if (backdrop) {
      await user.click(backdrop); // closes datePicker first
      await user.click(backdrop); // then closes modal
    }
  });
});
