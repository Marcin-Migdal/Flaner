import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../api/events/types";
import type { ParticipantResult } from "../../api/participants";
import { AvailabilityGridView } from "./AvailabilityGridView";

let mockIsMobile = false;

vi.mock("@flaner/shared/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@flaner/shared/hooks")>();
  return {
    ...actual,
    useIsMobile: () => mockIsMobile,
  };
});

describe("AvailabilityGridView", () => {
  const mockVoteSlot = vi.fn();

  const mockEvent: SchedulerEvent = {
    id: "evt-grid",
    name: "Sprint Planning",
    description: "Bi-weekly sprint planning",
    creatorId: "user-1",
    participants: ["user-1", "user-2", "user-3"],
    proposedDates: [
      {
        start: "2026-07-10",
        end: "2026-07-10",
        color: "#3b82f6",
        votes: {
          "user-1": "yes",
          "user-2": "maybe",
          "user-3": "no",
        },
      },
      {
        start: "2026-07-15",
        end: "2026-07-15",
        // votes undefined to test votes || {} fallback
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
    expect(screen.getByText("user-3")).toBeInTheDocument();
  });

  it("renders winner header when event is finalized and handles undefined finalizedSlotIndex", () => {
    const finalizedEvent: SchedulerEvent = {
      ...mockEvent,
      isFinalized: true,
      finalizedSlotIndex: 0,
    };

    const { rerender } = renderWithProviders(
      <AvailabilityGridView
        event={finalizedEvent}
        participantsProfiles={mockProfiles}
        currentUserId="user-1"
      />,
    );

    expect(screen.getByText(/grid\.winner/i)).toBeInTheDocument();

    rerender(
      <AvailabilityGridView
        event={{ ...finalizedEvent, finalizedSlotIndex: undefined }}
        participantsProfiles={mockProfiles}
        currentUserId="user-1"
      />,
    );
    expect(screen.getByText(/grid\.status/i)).toBeInTheDocument();
  });

  it("renders correctly in mobile view", () => {
    mockIsMobile = true;
    try {
      renderWithProviders(
        <AvailabilityGridView
          event={mockEvent}
          participantsProfiles={mockProfiles}
          currentUserId="user-1"
        />,
      );

      expect(screen.getByText("Alice")).toBeInTheDocument();
    } finally {
      mockIsMobile = false;
    }
  });

  it("triggers onVoteSlot when interactive vote button is clicked", async () => {
    const user = userEvent.setup();
    mockVoteSlot.mockClear();

    renderWithProviders(
      <AvailabilityGridView
        event={mockEvent}
        participantsProfiles={mockProfiles}
        currentUserId="user-1"
        onVoteSlot={mockVoteSlot}
      />,
    );

    // Click maybe button in user-1's interactive cell for slot 0
    const maybeBtns = screen.getAllByRole("button", { name: "?" });
    await user.click(maybeBtns[0]);
    // Click no button -> calls onVoteSlot with "no"
    const noBtns = screen.getAllByRole("button", { name: "voting.no" });
    await user.click(noBtns[0]);
    expect(mockVoteSlot).toHaveBeenCalledWith(0, "no");

    // Click yes button (which is active) -> toggles to null
    const unvotedBtns = screen.getAllByRole("button", { name: "voting.unvoted" });
    await user.click(unvotedBtns[0]);
    expect(mockVoteSlot).toHaveBeenCalledWith(0, null);
  });

  it("calculates score with maybe votes and handles missing onVoteSlot", async () => {
    const user = userEvent.setup();
    const eventWithMaybe: SchedulerEvent = {
      ...mockEvent,
      proposedDates: [
        {
          start: "2026-07-10",
          end: "2026-07-10",
          votes: {
            "user-1": "maybe",
            "user-2": "unknown" as unknown as "yes" | "no" | "maybe",
          },
        },
      ],
    };

    renderWithProviders(
      <AvailabilityGridView
        event={eventWithMaybe}
        participantsProfiles={mockProfiles}
        currentUserId="user-1"
      />,
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    // Clicking vote button without onVoteSlot provided
    const maybeBtns = screen.getAllByRole("button", { name: "?" });
    await user.click(maybeBtns[0]);
  });

  it("renders non-interactive grid when currentUserId is not provided", () => {
    renderWithProviders(
      <AvailabilityGridView
        event={mockEvent}
        participantsProfiles={mockProfiles}
        currentUserId={undefined}
      />,
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /voting\./i })).not.toBeInTheDocument();
  });
});
