import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { SplitEditor } from "./SplitEditor";
import type { CreateExpenseFormData } from "../../../../../../utils/schemas";
import type { SplitGroupMember } from "../../../../../../hooks/useSplitGroupMembers";

const mockMembers: SplitGroupMember[] = [
  { id: "user-1", name: "Alice", isCurrentUser: true },
  { id: "user-2", name: "Bob", isCurrentUser: false },
];

const membersById = new Map<string, SplitGroupMember>(mockMembers.map((m) => [m.id, m]));

const TestHarness = ({
  defaultValues,
  membersMap = membersById,
  triggerError = false,
}: {
  defaultValues?: Partial<CreateExpenseFormData>;
  membersMap?: Map<string, SplitGroupMember>;
  triggerError?: boolean;
}) => {
  const methods = useForm<CreateExpenseFormData>({
    defaultValues: {
      title: "Dinner",
      amount: 100,
      currency: "EUR",
      category: "food",
      date: new Date(),
      paidBy: "user-1",
      splitType: "equally",
      splits: [
        { userId: "user-1", included: true, amount: 50 },
        { userId: "user-2", included: true, amount: 50 },
      ],
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (triggerError) {
      methods.setError("splits", { type: "manual", message: "Splits total does not match expense amount" });
    }
  }, [triggerError, methods]);

  return (
    <FormProvider {...methods}>
      <SplitEditor membersById={membersMap} />
    </FormProvider>
  );
};

describe("SplitEditor", () => {
  it("renders equal split mode with members and calculated shares", () => {
    renderWithProviders(<TestHarness />);

    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });

  it("switches to exact split mode and displays numeric amount inputs", async () => {
    const user = userEvent.setup();
    renderWithProviders(<TestHarness defaultValues={{ splitType: "equally" }} />);

    const radioButtons = screen.getAllByRole("radio");
    const exactRadio = radioButtons[1];
    await user.click(exactRadio);

    const spinbuttons = screen.getAllByRole("spinbutton");
    expect(spinbuttons).toHaveLength(2);
  });

  it("displays validation error when splits error is present", () => {
    renderWithProviders(<TestHarness triggerError={true} />);

    expect(screen.getByText("Splits total does not match expense amount")).toBeInTheDocument();
  });

  it("renders remaining and exceeded indicators in exact split mode", () => {
    const { rerender } = renderWithProviders(
      <TestHarness
        key="remaining"
        defaultValues={{
          splitType: "exact",
          amount: 100,
          splits: [
            { userId: "user-1", included: true, amount: 40 },
            { userId: "user-2", included: true, amount: 40 },
          ],
        }}
      />,
    );
    expect(screen.getByText("splits.expenseModal.remaining")).toBeInTheDocument();

    rerender(
      <TestHarness
        key="exceeded"
        defaultValues={{
          splitType: "exact",
          amount: 100,
          splits: [
            { userId: "user-1", included: true, amount: 60 },
            { userId: "user-2", included: true, amount: 60 },
          ],
        }}
      />,
    );
    expect(screen.getByText("splits.expenseModal.exceeded")).toBeInTheDocument();
  });

  it("renders balanced indicator in exact mode when difference is zero and handles empty currency", () => {
    renderWithProviders(
      <TestHarness
        defaultValues={{
          splitType: "exact",
          amount: 100,
          currency: "",
          splits: [
            { userId: "user-1", included: true, amount: 50 },
            { userId: "user-2", included: true, amount: 50 },
          ],
        }}
      />,
    );
    expect(screen.getByText("splits.expenseModal.balanced")).toBeInTheDocument();
  });

  it("returns null summary when total amount is zero in equal mode", () => {
    renderWithProviders(
      <TestHarness
        defaultValues={{
          splitType: "equally",
          amount: 0,
        }}
      />,
    );
    expect(screen.queryByText(/splits\.expenseModal\.perPerson/)).not.toBeInTheDocument();
  });

  it("handles unknown member and root splits validation error", () => {
    const emptyMembers = new Map<string, SplitGroupMember>();
    renderWithProviders(
      <TestHarness
        membersMap={emptyMembers}
        triggerError={false}
      />,
    );
    expect(screen.getAllByText("splits.unknownUser")).toHaveLength(2);
  });
});
