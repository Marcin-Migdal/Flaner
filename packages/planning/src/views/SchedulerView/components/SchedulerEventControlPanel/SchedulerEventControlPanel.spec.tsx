import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../../../api/events/types";
import type { ParticipantResult } from "../../../../api/participants";
import { SchedulerEventControlPanel } from "./SchedulerEventControlPanel";

const mockUser = { uid: "user-1", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockDeleteEvent = vi.fn().mockImplementation((_id, options) => {
  options?.onSuccess?.();
  return Promise.resolve();
});

const mockUnfinalizeEvent = vi.fn().mockImplementation((_args, options) => {
  options?.onSuccess?.();
  return Promise.resolve();
});

const mockBatchVoteUnvoted = vi.fn().mockImplementation((_args, options) => {
  options?.onSuccess?.();
  return Promise.resolve();
});

vi.mock("../../../../hooks/api/mutation", () => ({
  useDeleteEventMutation: () => ({
    mutateAsync: mockDeleteEvent,
    isPending: false,
  }),
  useUnfinalizeEventMutation: () => ({
    mutateAsync: mockUnfinalizeEvent,
    isPending: false,
  }),
  useBatchVoteUnvotedSlotsMutation: () => ({
    mutateAsync: mockBatchVoteUnvoted,
    isPending: false,
  }),
  useCreateEventMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateEventMutation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

const mockEvent: SchedulerEvent = {
  id: "evt-control",
  name: "Product Kickoff",
  description: "Kickoff meeting for Q3",
  creatorId: "user-1",
  participants: ["user-1", "user-2"],
  proposedDates: [
    {
      start: "2026-08-01",
      end: "2026-08-01",
      color: "#3b82f6",
      votes: {
        "user-1": "yes",
      },
    },
  ],
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

const secondEvent: SchedulerEvent = {
  ...mockEvent,
  id: "evt-2",
  name: "Sprint Planning",
};

vi.mock("../../../../components/EventModal", () => ({
  EventModal: ({
    isOpen,
    eventToEdit,
    onOpenChange,
    onSuccess,
  }: {
    isOpen?: boolean;
    eventToEdit?: SchedulerEvent | null;
    onOpenChange?: (open: boolean) => void;
    onSuccess?: (event?: SchedulerEvent) => void;
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="mock-event-modal">
        <span>{eventToEdit ? "edit-mode" : "create-mode"}</span>
        <button type="button" onClick={() => onOpenChange?.(false)}>Close Event Modal</button>
        <button type="button" onClick={() => onSuccess?.({ ...mockEvent, id: "created-evt-99" })}>Success Event Modal</button>
        <button type="button" onClick={() => onSuccess?.(undefined)}>Empty Id Event Modal</button>
      </div>
    );
  },
}));

vi.mock("../../../../components/FinalizeEventModal", () => ({
  FinalizeEventModal: ({
    open,
    onOpenChange,
  }: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => {
    if (!open) return null;
    return (
      <div data-testid="mock-finalize-modal">
        <span>finalize-modal-open</span>
        <button type="button" onClick={() => onOpenChange?.(false)}>Close Finalize Modal</button>
      </div>
    );
  },
}));

describe("SchedulerEventControlPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.removeAttribute("data-scroll-locked");
    document.body.style.pointerEvents = "auto";
  });

  const mockParticipants: ParticipantResult[] = [
    { id: "user-1", name: "Alice", avatarUrl: "", type: "user", username: "alice", usernameLower: "alice" },
    { id: "user-2", name: "Bob", avatarUrl: "", type: "user", username: "bob", usernameLower: "bob" },
  ];

  it("renders active event header and participants list", () => {
    renderWithProviders(
      <SchedulerEventControlPanel
        events={[mockEvent]}
        isEventsLoading={false}
        activeEvent={mockEvent}
        participants={mockParticipants}
        isParticipantsLoading={false}
      />,
    );

    expect(screen.getByText("Product Kickoff")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("opens create event modal, handles success navigation, and handles close", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SchedulerEventControlPanel
        events={[mockEvent]}
        isEventsLoading={false}
        activeEvent={mockEvent}
        participants={mockParticipants}
        isParticipantsLoading={false}
      />,
    );

    const createBtn = screen.getByTitle("hub.addEvent");
    await user.click(createBtn);

    expect(screen.getByText("create-mode")).toBeInTheDocument();

    // Click success
    const successBtn = screen.getByText("Success Event Modal");
    await user.click(successBtn);
    expect(mockNavigate).toHaveBeenCalledWith({ hash: "created-evt-99" });

    // Click close
    await user.click(createBtn);
    const closeBtn = screen.getByText("Close Event Modal");
    await user.click(closeBtn);
    expect(screen.queryByTestId("mock-event-modal")).not.toBeInTheDocument();
  });

  it("opens edit event modal when edit button is clicked", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SchedulerEventControlPanel
        events={[mockEvent]}
        isEventsLoading={false}
        activeEvent={mockEvent}
        participants={mockParticipants}
        isParticipantsLoading={false}
      />,
    );

    const editBtn = screen.getByTitle("actions.edit");
    await user.click(editBtn);

    expect(screen.getByText("edit-mode")).toBeInTheDocument();
  });

  it("handles event selection via dropdown and navigates to hash", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SchedulerEventControlPanel
        events={[mockEvent, secondEvent]}
        isEventsLoading={false}
        activeEvent={mockEvent}
        participants={mockParticipants}
        isParticipantsLoading={false}
      />,
    );

    const combobox = screen.getByRole("combobox");
    fireEvent.keyDown(combobox, { key: "ArrowDown" });

    const secondOption = await screen.findByText("Sprint Planning");
    await user.click(secondOption);

    expect(mockNavigate).toHaveBeenCalledWith({ hash: "evt-2" });
  });

  it("handles event deletion confirmation when remaining events exist and when no remaining events", async () => {
    const { rerender } = renderWithProviders(
      <SchedulerEventControlPanel
        events={[mockEvent, secondEvent]}
        isEventsLoading={false}
        activeEvent={mockEvent}
        participants={mockParticipants}
        isParticipantsLoading={false}
      />,
    );

    // Delete with remaining events
    const deleteBtn = screen.getByTitle("actions.delete");
    fireEvent.click(deleteBtn);

    expect(screen.getByText("deleteModal.title")).toBeInTheDocument();

    const confirmDeleteBtn = screen.getByRole("button", { name: "actions.delete" });
    fireEvent.click(confirmDeleteBtn);

    expect(mockDeleteEvent).toHaveBeenCalledWith("evt-control", expect.anything());
    expect(mockNavigate).toHaveBeenCalledWith({ hash: "evt-2" }, { replace: true });

    // Rerender with single event and test cancel
    rerender(
      <SchedulerEventControlPanel
        events={[mockEvent]}
        isEventsLoading={false}
        activeEvent={mockEvent}
        participants={mockParticipants}
        isParticipantsLoading={false}
      />,
    );

    const deleteBtn2 = screen.getByTitle("actions.delete");
    fireEvent.click(deleteBtn2);

    const cancelBtn = screen.getByRole("button", { name: "actions.cancel" });
    fireEvent.click(cancelBtn);
    expect(screen.queryByText("deleteModal.title")).not.toBeInTheDocument();

    // Confirm delete with no remaining events
    fireEvent.click(deleteBtn2);
    const confirmDeleteBtn2 = screen.getByRole("button", { name: "actions.delete" });
    fireEvent.click(confirmDeleteBtn2);
    expect(mockNavigate).toHaveBeenCalledWith({ hash: "" }, { replace: true });
  });

  it("handles reopening a finalized event", async () => {
    const finalizedEvent: SchedulerEvent = {
      ...mockEvent,
      isFinalized: true,
      finalizedSlotIndex: 0,
    };

    renderWithProviders(
      <SchedulerEventControlPanel
        events={[finalizedEvent]}
        isEventsLoading={false}
        activeEvent={finalizedEvent}
        participants={mockParticipants}
        isParticipantsLoading={false}
      />,
    );

    const reopenBtn = screen.getByRole("button", { name: /actions\.reopenVoting/i });
    fireEvent.click(reopenBtn);

    const confirmTitle = await screen.findByText("reopenConfirm.title");
    expect(confirmTitle).toBeInTheDocument();

    const confirmReopenBtn = screen.getByRole("button", { name: "actions.reopenVoting" });
    fireEvent.click(confirmReopenBtn);

    expect(mockUnfinalizeEvent).toHaveBeenCalledWith({ event: finalizedEvent }, expect.anything());
  });

  it("handles batch rejecting unvoted slots", async () => {
    const eventWithUnvoted: SchedulerEvent = {
      ...mockEvent,
      proposedDates: [
        {
          start: "2026-08-01",
          end: "2026-08-01",
          color: "#3b82f6",
          votes: {},
        },
      ],
    };

    renderWithProviders(
      <SchedulerEventControlPanel
        events={[eventWithUnvoted]}
        isEventsLoading={false}
        activeEvent={eventWithUnvoted}
        participants={mockParticipants}
        isParticipantsLoading={false}
      />,
    );

    const rejectBtn = screen.getByTitle("actions.rejectUnvotedFull");
    fireEvent.click(rejectBtn);

    const confirmTitle = await screen.findByText("rejectConfirm.title");
    expect(confirmTitle).toBeInTheDocument();

    const confirmRejectBtn = screen.getByRole("button", { name: "rejectConfirm.confirm" });
    fireEvent.click(confirmRejectBtn);

    expect(mockBatchVoteUnvoted).toHaveBeenCalledWith(
      {
        eventId: eventWithUnvoted.id,
        userId: "user-1",
        fallbackVote: "no",
      },
      expect.anything(),
    );
  });

  it("opens and closes finalize event modal", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SchedulerEventControlPanel
        events={[mockEvent]}
        isEventsLoading={false}
        activeEvent={mockEvent}
        participants={mockParticipants}
        isParticipantsLoading={false}
      />,
    );

    const finalizeBtn = screen.getByTitle("actions.finalizeEvent");
    await user.click(finalizeBtn);

    expect(screen.getByTestId("mock-finalize-modal")).toBeInTheDocument();

    const closeBtn = screen.getByText("Close Finalize Modal");
    await user.click(closeBtn);

    expect(screen.queryByTestId("mock-finalize-modal")).not.toBeInTheDocument();
  });

  it("handles event creation success without id without navigating", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SchedulerEventControlPanel
        events={[mockEvent]}
        isEventsLoading={false}
        isParticipantsLoading={false}
        activeEvent={mockEvent}
      />,
    );

    const createBtn = screen.getByTitle("hub.addEvent");
    await user.click(createBtn);

    mockNavigate.mockClear();
    const emptyIdBtn = screen.getByText("Empty Id Event Modal");
    await user.click(emptyIdBtn);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("cancels event deletion in confirmation popup", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SchedulerEventControlPanel
        events={[mockEvent, secondEvent]}
        isEventsLoading={false}
        isParticipantsLoading={false}
        activeEvent={mockEvent}
        participants={mockParticipants}
      />,
    );

    const deleteBtn = screen.getByTitle("actions.delete");
    await user.click(deleteBtn);

    const cancelBtn = screen.getByRole("button", { name: "actions.cancel" });
    await user.click(cancelBtn);

    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });
});
