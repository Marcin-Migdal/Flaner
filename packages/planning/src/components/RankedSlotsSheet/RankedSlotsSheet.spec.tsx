import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../api/events/types";
import type { ParticipantResult } from "../../api/participants";
import { RankedSlotsSheet } from "./RankedSlotsSheet";

describe("RankedSlotsSheet", () => {
  const mockVoteSlot = vi.fn();

  const mockEvent: SchedulerEvent = {
    id: "evt-ranked",
    name: "Strategy Meeting",
    description: "Annual meeting",
    creatorId: "u1",
    participants: ["u1", "u2"],
    proposedDates: [
      {
        start: "2026-08-01",
        end: "2026-08-01",
        color: "#10b981",
        votes: {
          u1: "yes",
          u2: "yes",
        },
      },
      {
        start: "2026-08-05",
        end: "2026-08-06",
        color: "#6366f1",
        votes: {
          u1: "maybe",
          u2: "no",
        },
      },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  const mockProfiles: ParticipantResult[] = [
    { id: "u1", name: "Alice", avatarUrl: "", type: "user", username: "alice", usernameLower: "alice" },
    { id: "u2", name: "Bob", avatarUrl: "", type: "user", username: "bob", usernameLower: "bob" },
  ];

  it("renders ranked slots with rank badges and match percentages", () => {
    renderWithProviders(
      <RankedSlotsSheet
        open={true}
        onOpenChange={vi.fn()}
        event={mockEvent}
        participantsProfiles={mockProfiles}
        currentUserId="u1"
      />,
    );

    expect(screen.getByText("Strategy Meeting")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("calls onVoteSlot when vote button inside sheet is clicked", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <RankedSlotsSheet
        open={true}
        onOpenChange={vi.fn()}
        event={mockEvent}
        participantsProfiles={mockProfiles}
        currentUserId="u1"
        onVoteSlot={mockVoteSlot}
      />,
    );

    // Find button with ? or vote
    const maybeBtn = screen.getAllByTitle(/voting\.maybe/i)[0];
    await user.click(maybeBtn);

    expect(mockVoteSlot).toHaveBeenCalled();
  });

  it("does not render vote buttons when event is finalized", () => {
    const finalizedEvent: SchedulerEvent = {
      ...mockEvent,
      isFinalized: true,
      finalizedSlotIndex: 0,
    };

    renderWithProviders(
      <RankedSlotsSheet
        open={true}
        onOpenChange={vi.fn()}
        event={finalizedEvent}
        participantsProfiles={mockProfiles}
        currentUserId="u1"
        onVoteSlot={mockVoteSlot}
      />,
    );

    expect(screen.queryByTitle(/voting\.maybe/i)).not.toBeInTheDocument();
  });
});
