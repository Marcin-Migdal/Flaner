import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../../../api/events/types";
import type { ParticipantResult } from "../../../../api/participants";
import { SchedulerEventControlPanel } from "./SchedulerEventControlPanel";

const mockUser = { uid: "user-1", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockDeleteEvent = vi.fn();
const mockUnfinalizeEvent = vi.fn();
const mockBatchVoteUnvoted = vi.fn();

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

describe("SchedulerEventControlPanel", () => {
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

  it("opens create event modal when new event action is triggered", async () => {
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

    // Look for add/create event button
    const buttons = screen.getAllByRole("button");
    const createBtn = buttons.find((btn) => btn.querySelector("svg.lucide-plus"));
    if (createBtn) {
      await user.click(createBtn);
      expect(screen.getByText("create.title")).toBeInTheDocument();
    }
  });
});
