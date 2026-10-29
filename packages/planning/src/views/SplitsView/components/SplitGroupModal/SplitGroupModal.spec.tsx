import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import * as reactHookForm from "react-hook-form";
import type { SplitGroup } from "../../../../api/splits";
import { SplitGroupModal } from "./SplitGroupModal";

const mockUser = { uid: "user-1", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const createGroupMock = vi.fn().mockImplementation(async (data, options) => {
  options?.onSuccess?.({ id: "new-grp-id", ...data });
  return { id: "new-grp-id", ...data };
});
const updateGroupMock = vi.fn().mockImplementation(async (_params, options) => {
  options?.onSuccess?.();
  return undefined;
});

vi.mock("../../../../hooks/api/mutation", () => ({
  useCreateSplitGroupMutation: () => ({
    mutateAsync: createGroupMock,
    isPending: false,
  }),
  useUpdateSplitGroupMutation: () => ({
    mutateAsync: updateGroupMock,
    isPending: false,
  }),
}));

vi.mock("../../../../components/ParticipantSelect", () => ({
  ParticipantSelect: () => {
    const { setValue } = reactHookForm.useFormContext();
    return (
      <div>
        <button
          type="button"
          onClick={() => setValue("participants", ["user-1", "user-2"], { shouldValidate: true })}
        >
          Add Participant
        </button>
        <button
          type="button"
          onClick={() => setValue("participants", [], { shouldValidate: true })}
        >
          Clear Participants
        </button>
      </div>
    );
  },
}));

const mockGroup: SplitGroup = {
  id: "grp-1",
  name: "Eurotrip 2026",
  description: "Epic roadtrip across Europe",
  defaultCurrency: "EUR",
  lastUsedCurrency: "EUR",
  createdBy: "user-1",
  participants: ["user-1"],
  formerParticipants: [],
  simplifyDebts: true,
  totalSpent: {},
  balances: {},
  pairBalances: {},
  expensesCount: 0,
  settlementsCount: 0,
  status: "active",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

describe("SplitGroupModal", () => {
  it("renders create modal and submits new group", async () => {
    const user = userEvent.setup();
    const onSuccessMock = vi.fn();
    const onOpenChangeMock = vi.fn();

    renderWithProviders(
      <SplitGroupModal
        open={true}
        onOpenChange={onOpenChangeMock}
        onSuccess={onSuccessMock}
      />
    );

    expect(screen.getByText("splits.groupModal.title")).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText("splits.fields.name");
    await user.type(nameInput, "Summer Beach House");

    const addParticipantBtn = screen.getByRole("button", { name: "Add Participant" });
    await user.click(addParticipantBtn);

    const submitBtn = screen.getByRole("button", { name: "splits.actions.createGroup" });
    await user.click(submitBtn);

    expect(createGroupMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Summer Beach House",
      }),
      expect.any(Object),
    );
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    expect(onSuccessMock).toHaveBeenCalledWith("new-grp-id");
  });

  it("renders edit modal with existing values and submits update", async () => {
    const user = userEvent.setup();
    const onSuccessMock = vi.fn();
    const onOpenChangeMock = vi.fn();

    renderWithProviders(
      <SplitGroupModal
        open={true}
        onOpenChange={onOpenChangeMock}
        groupToEdit={mockGroup}
        onSuccess={onSuccessMock}
      />
    );

    expect(screen.getByText("splits.groupModal.editTitle")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Eurotrip 2026")).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue("Eurotrip 2026");
    await user.clear(nameInput);
    await user.type(nameInput, "Eurotrip Updated");

    const submitBtn = screen.getByRole("button", { name: "splits.actions.save" });
    await user.click(submitBtn);

    expect(updateGroupMock).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "grp-1",
        data: expect.objectContaining({
          name: "Eurotrip Updated",
        }),
      }),
      expect.any(Object),
    );
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    expect(onSuccessMock).toHaveBeenCalledWith("grp-1");
  });

  it("handles mutation catch block when createGroup rejects", async () => {
    const user = userEvent.setup();
    createGroupMock.mockRejectedValueOnce(new Error("Network error"));

    renderWithProviders(
      <SplitGroupModal
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const nameInput = screen.getByPlaceholderText("splits.fields.name");
    await user.type(nameInput, "Failing Group");

    const addParticipantBtn = screen.getByRole("button", { name: "Add Participant" });
    await user.click(addParticipantBtn);

    const submitBtn = screen.getByRole("button", { name: "splits.actions.createGroup" });
    await user.click(submitBtn);

    expect(createGroupMock).toHaveBeenCalled();
  });

  it("calls onOpenChange(false) when clicking cancel", async () => {
    const user = userEvent.setup();
    const onOpenChangeMock = vi.fn();

    renderWithProviders(
      <SplitGroupModal
        open={true}
        onOpenChange={onOpenChangeMock}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: "splits.actions.cancel" });
    await user.click(cancelBtn);

    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });

  it("displays validation error when participants list is cleared", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SplitGroupModal
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const clearBtn = screen.getByRole("button", { name: "Clear Participants" });
    await user.click(clearBtn);

    const submitBtn = screen.getByRole("button", { name: "splits.actions.createGroup" });
    await user.click(submitBtn);

    // Validation schema requires at least 1 participant
    expect(createGroupMock).not.toHaveBeenCalled();
  });
});
