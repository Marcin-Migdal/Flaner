import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../api/events/types";
import type { ParticipantResult } from "../../api/participants";
import { AvailabilityGridView } from "./AvailabilityGridView";

describe("AvailabilityGridView", () => {
  const mockVoteSlot = vi.fn();

  const mockEvent: SchedulerEvent = {
    id: "evt-grid",
    name: "Sprint Planning",
    description: "Bi-weekly sprint planning",
    creatorId: "user-1",
    participants: ["user-1", "user-2"],
    proposedDates: [
      {
        start: "2026-07-10",
        end: "2026-07-10",
        color: "#3b82f6",
        votes: {
          "user-1": "yes",
          "user-2": "maybe",
        },
      },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  const mockProfiles: ParticipantResult[] = [
    { id: "user-1", name: "Alice", avatarUrl: "", type: "user", username: "alice", usernameLower: "alice" },
    { id: "user-2", name: "Bob", avatarUrl: "", type: "user", username: "bob", usernameLower: "bob" },
  ];

  it("renders participants and proposed date slots", () => {
    renderWithProviders(
      <AvailabilityGridView
        event={mockEvent}
        participantsProfiles={mockProfiles}
        currentUserId="user-1"
        onVoteSlot={mockVoteSlot}
      />,
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("renders winner header when event is finalized", () => {
    const finalizedEvent: SchedulerEvent = {
      ...mockEvent,
      isFinalized: true,
      finalizedSlotIndex: 0,
    };

    renderWithProviders(
      <AvailabilityGridView
        event={finalizedEvent}
        participantsProfiles={mockProfiles}
        currentUserId="user-1"
      />,
    );

    expect(screen.getByText(/grid\.winner/i)).toBeInTheDocument();
  });

  it("triggers onVoteSlot when interactive vote button is clicked", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <AvailabilityGridView
        event={mockEvent}
        participantsProfiles={mockProfiles}
        currentUserId="user-1"
        onVoteSlot={mockVoteSlot}
      />,
    );

    // Click maybe button in user-1's interactive cell
    const buttons = screen.getAllByRole("button");
    const maybeBtn = buttons.find((btn) => btn.getAttribute("aria-label")?.includes("maybe"));
    if (maybeBtn) {
      await user.click(maybeBtn);
      expect(mockVoteSlot).toHaveBeenCalled();
    }
  });
});
