import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../api/events/types";
import type { ParticipantResult } from "../../api/participants";
import { SlotVotingModal } from "./SlotVotingModal";

const mockVoteSlotMutateAsync = vi.fn();

vi.mock("../../hooks/api/mutation/useVoteSlotMutation", () => ({
  useVoteSlotMutation: () => ({
    mutateAsync: mockVoteSlotMutateAsync,
    isPending: false,
  }),
}));

describe("SlotVotingModal", () => {
  const mockEvent: SchedulerEvent = {
    id: "evt-1",
    name: "Project Sync",
    description: "Sync meeting",
    creatorId: "u1",
    participants: ["u1", "u2", "u3"],
    proposedDates: [
      {
        start: "2026-07-20T10:00:00Z",
        end: "2026-07-20T12:00:00Z",
        color: "#3b82f6",
        votes: {
          u1: "yes",
          u2: "maybe",
        },
      },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  const mockParticipants: ParticipantResult[] = [
    { id: "u1", name: "Alice", avatarUrl: "", type: "user", username: "alice", usernameLower: "alice" },
    { id: "u2", name: "Bob", avatarUrl: "", type: "user", username: "bob", usernameLower: "bob" },
    { id: "u3", name: "Charlie", avatarUrl: "", type: "user", username: "charlie", usernameLower: "charlie" },
  ];

  it("returns null if event is null or slotIndex is invalid", () => {
    const { container } = renderWithProviders(
      <SlotVotingModal
        isOpen={true}
        onOpenChange={vi.fn()}
        event={null}
        slotIndex={null}
        participantsProfiles={mockParticipants}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders participants breakdown by vote and handles vote click", async () => {
    const user = userEvent.setup();
    mockVoteSlotMutateAsync.mockResolvedValueOnce({});

    renderWithProviders(
      <SlotVotingModal
        isOpen={true}
        onOpenChange={vi.fn()}
        event={mockEvent}
        slotIndex={0}
        participantsProfiles={mockParticipants}
        currentUserId="u1"
      />,
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();

    // Click "Maybe" vote button
    const maybeButton = screen.getByRole("button", { name: /voting\.maybe/i });
    await user.click(maybeButton);

    expect(mockVoteSlotMutateAsync).toHaveBeenCalledWith({
      eventId: "evt-1",
      slotIndex: 0,
      userId: "u1",
      vote: "maybe",
    });
  });

  it("toggles off vote if clicked the same vote", async () => {
    const user = userEvent.setup();
    mockVoteSlotMutateAsync.mockResolvedValueOnce({});

    renderWithProviders(
      <SlotVotingModal
        isOpen={true}
        onOpenChange={vi.fn()}
        event={mockEvent}
        slotIndex={0}
        participantsProfiles={mockParticipants}
        currentUserId="u1"
      />,
    );

    // Current vote of u1 is "yes". Clicking "yes" again should vote null
    const yesButton = screen.getByRole("button", { name: /voting\.yes/i });
    await user.click(yesButton);

    expect(mockVoteSlotMutateAsync).toHaveBeenCalledWith({
      eventId: "evt-1",
      slotIndex: 0,
      userId: "u1",
      vote: null,
    });
  });
});
