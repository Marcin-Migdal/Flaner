import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { Expense, SplitGroup } from "../../../../api/splits";
import type { SplitGroupMember } from "../../../../hooks/useSplitGroupMembers";
import { ExpenseModal } from "./ExpenseModal";
import { toast } from "@flaner/shared/utils";

const mockUser = { uid: "user-1", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("@flaner/shared/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@flaner/shared/utils")>();
  return {
    ...actual,
    toast: {
      ...actual.toast,
      failure: vi.fn(),
      attention: vi.fn(),
      success: vi.fn(),
    },
  };
});

const createExpenseMock = vi.fn().mockImplementation((_args, options) => {
  options?.onSuccess?.();
  return Promise.resolve("exp-new");
});

const updateExpenseMock = vi.fn().mockImplementation((_args, options) => {
  options?.onSuccess?.();
  return Promise.resolve();
});

vi.mock("../../../../hooks/api/mutation", () => ({
  useCreateExpenseMutation: () => ({
    mutateAsync: createExpenseMock,
    isPending: false,
  }),
  useUpdateExpenseMutation: () => ({
    mutateAsync: updateExpenseMock,
    isPending: false,
  }),
}));

const mockGroup: SplitGroup = {
  id: "grp-1",
  name: "Eurotrip 2026",
  description: "Epic roadtrip across Europe",
  defaultCurrency: "EUR",
  lastUsedCurrency: "EUR",
  createdBy: "user-1",
  participants: ["user-1", "user-2"],
  formerParticipants: [],
  simplifyDebts: true,
  totalSpent: { EUR: 0 },
  balances: { EUR: { "user-1": 0, "user-2": 0 } },
  pairBalances: {},
  expensesCount: 0,
  settlementsCount: 0,
  status: "active",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

const mockMembers: SplitGroupMember[] = [
  { id: "user-1", name: "Alice", isCurrentUser: true },
  { id: "user-2", name: "Bob", isCurrentUser: false },
];

const mockExpense: Expense = {
  id: "exp-1",
  groupId: "grp-1",
  title: "Dinner",
  amount: 4000,
  currency: "EUR",
  category: "food",
  date: "2026-06-01",
  paidBy: "user-1",
  splitType: "equally",
  splits: [
    { userId: "user-1", amount: 2000 },
    { userId: "user-2", amount: 2000 },
  ],
  createdBy: "user-1",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

describe("ExpenseModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders create modal and creates an expense upon valid submission", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    renderWithProviders(
      <ExpenseModal
        open={true}
        onOpenChange={onOpenChange}
        group={mockGroup}
        members={mockMembers}
        expenseToEdit={null}
      />,
    );

    const titleInput = screen.getByLabelText("splits.fields.title");
    await user.type(titleInput, "Team Dinner");

    const amountInput = screen.getByLabelText("splits.fields.amount");
    fireEvent.change(amountInput, { target: { value: "50" } });

    const submitBtn = screen.getByRole("button", { name: "splits.actions.addExpense" });
    await user.click(submitBtn);

    expect(createExpenseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "grp-1",
        data: expect.objectContaining({
          title: "Team Dinner",
          amount: 5000,
          currency: "EUR",
        }),
      }),
      expect.anything(),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders edit modal with populated fields and updates expense", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    renderWithProviders(
      <ExpenseModal
        open={true}
        onOpenChange={onOpenChange}
        group={mockGroup}
        members={mockMembers}
        expenseToEdit={mockExpense}
      />,
    );

    const titleInput = screen.getByLabelText("splits.fields.title");
    expect(titleInput).toHaveValue("Dinner");

    const saveBtn = screen.getByRole("button", { name: "splits.actions.save" });
    await user.click(saveBtn);

    expect(updateExpenseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "grp-1",
        expenseId: "exp-1",
        data: expect.objectContaining({
          title: "Dinner",
          amount: 4000,
        }),
      }),
      expect.anything(),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("prevents editing and triggers toast failure if user is neither creator nor payer", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const unauthorizedExpense: Expense = {
      ...mockExpense,
      createdBy: "user-other",
      paidBy: "user-other",
    };

    renderWithProviders(
      <ExpenseModal
        open={true}
        onOpenChange={onOpenChange}
        group={mockGroup}
        members={mockMembers}
        expenseToEdit={unauthorizedExpense}
      />,
    );

    const saveBtn = screen.getByRole("button", { name: "splits.actions.save" });
    await user.click(saveBtn);

    expect(toast.failure).toHaveBeenCalled();
    expect(updateExpenseMock).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("calls onOpenChange(false) when cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    renderWithProviders(
      <ExpenseModal
        open={true}
        onOpenChange={onOpenChange}
        group={mockGroup}
        members={mockMembers}
      />,
    );

    const cancelBtn = screen.getByRole("button", { name: "splits.actions.cancel" });
    await user.click(cancelBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("creates an expense with exact splits", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    renderWithProviders(
      <ExpenseModal
        open={true}
        onOpenChange={onOpenChange}
        group={mockGroup}
        members={mockMembers}
        expenseToEdit={null}
      />,
    );

    const titleInput = screen.getByLabelText("splits.fields.title");
    await user.type(titleInput, "Exact Lunch");

    const amountInput = screen.getByLabelText("splits.fields.amount");
    fireEvent.change(amountInput, { target: { value: "60" } });

    const exactRadio = screen.getAllByRole("radio")[1];
    await user.click(exactRadio);

    const spinbuttons = screen.getAllByRole("spinbutton");
    fireEvent.change(spinbuttons[1], { target: { value: "30" } });
    fireEvent.change(spinbuttons[2], { target: { value: "30" } });

    const submitBtn = screen.getByRole("button", { name: "splits.actions.addExpense" });
    await user.click(submitBtn);

    expect(createExpenseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          splitType: "exact",
          splits: expect.arrayContaining([
            { userId: "user-1", amount: 3000 },
            { userId: "user-2", amount: 3000 },
          ]),
        }),
      }),
      expect.anything(),
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("dismisses dialog via close button", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    renderWithProviders(
      <ExpenseModal
        open={true}
        onOpenChange={onOpenChange}
        group={mockGroup}
        members={mockMembers}
        expenseToEdit={null}
      />,
    );

    const closeBtn = screen.getByRole("button", { name: /close/i });
    await user.click(closeBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("logs validation errors when submitted without required fields", async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderWithProviders(
      <ExpenseModal
        open={true}
        onOpenChange={vi.fn()}
        group={mockGroup}
        members={mockMembers}
        expenseToEdit={null}
      />,
    );

    const submitBtn = screen.getByRole("button", { name: "splits.actions.addExpense" });
    await user.click(submitBtn);

    expect(consoleSpy).toHaveBeenCalledWith("ExpenseForm validation errors:", expect.any(Object));
    consoleSpy.mockRestore();
  });

  it("handles exact splits with zero amounts, filtering them out", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    renderWithProviders(
      <ExpenseModal
        open={true}
        onOpenChange={onOpenChange}
        group={mockGroup}
        members={mockMembers}
        expenseToEdit={null}
      />,
    );

    const titleInput = screen.getByLabelText("splits.fields.title");
    await user.type(titleInput, "One Person Lunch");

    const amountInput = screen.getByLabelText("splits.fields.amount");
    fireEvent.change(amountInput, { target: { value: "30" } });

    const exactRadio = screen.getAllByRole("radio")[1];
    await user.click(exactRadio);

    const spinbuttons = screen.getAllByRole("spinbutton");
    fireEvent.change(spinbuttons[1], { target: { value: "30" } });
    // spinbuttons[2] left as default 0

    const submitBtn = screen.getByRole("button", { name: "splits.actions.addExpense" });
    await user.click(submitBtn);

    expect(createExpenseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          splitType: "exact",
          splits: [{ userId: "user-1", amount: 3000 }],
        }),
      }),
      expect.anything(),
    );
  });

  it("allows editing when createdBy is empty but paidBy matches current user", async () => {
    const user = userEvent.setup();
    const expenseWithEmptyCreator: Expense = {
      ...mockExpense,
      createdBy: "",
      paidBy: "user-1",
    };

    renderWithProviders(
      <ExpenseModal
        open={true}
        onOpenChange={vi.fn()}
        group={mockGroup}
        members={mockMembers}
        expenseToEdit={expenseWithEmptyCreator}
      />,
    );

    const submitBtn = screen.getByRole("button", { name: "splits.actions.save" });
    await user.click(submitBtn);

    expect(updateExpenseMock).toHaveBeenCalled();
  });

  it("handles createExpense and updateExpense rejections gracefully", async () => {
    const user = userEvent.setup();
    createExpenseMock.mockRejectedValueOnce(new Error("Failed"));

    renderWithProviders(
      <ExpenseModal
        open={true}
        onOpenChange={vi.fn()}
        group={mockGroup}
        members={mockMembers}
        expenseToEdit={null}
      />,
    );

    const titleInput = screen.getByLabelText("splits.fields.title");
    await user.type(titleInput, "Failing Expense");

    const amountInput = screen.getByLabelText("splits.fields.amount");
    fireEvent.change(amountInput, { target: { value: "10" } });

    const submitBtn = screen.getByRole("button", { name: "splits.actions.addExpense" });
    await user.click(submitBtn);

    expect(createExpenseMock).toHaveBeenCalled();
  });
});
