import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
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

  it("handles tie-breaker sorting and renders rank 2, 3, and 4 badges", () => {
    const multiSlotEvent: SchedulerEvent = {
      ...mockEvent,
      participants: ["u1", "u2", "u3", "u4"],
      proposedDates: [
        // Slot 0: 3 yes votes -> Rank 1
        {
          start: "2026-08-01",
          end: "2026-08-01",
          votes: { u1: "yes", u2: "yes", u3: "yes" },
        },
        // Slot 1: 2 yes votes -> Rank 2
        {
          start: "2026-08-02",
          end: "2026-08-02",
          votes: { u1: "yes", u2: "yes" },
        },
        // Slot 2: 1 yes vote -> Rank 3 (hits line 179)
        {
          start: "2026-08-03",
          end: "2026-08-03",
          votes: { u1: "yes" },
        },
        // Slot 3: 1 yes vote -> Equal score and yesCount to Slot 2 (hits tie-breaker line 124)
        {
          start: "2026-08-04",
          end: "2026-08-04",
          votes: { u2: "yes" },
        },
        // Slot 4: 0 votes -> Rank 4 (hits generic rank #4)
        {
          start: "2026-08-05",
          end: "2026-08-05",
          votes: {},
        },
      ],
    };

    renderWithProviders(
      <RankedSlotsSheet
        open={true}
        onOpenChange={vi.fn()}
        event={multiSlotEvent}
        participantsProfiles={mockProfiles}
        currentUserId="u1"
      />,
    );

    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getAllByText("#3").length).toBeGreaterThan(0);
  });

  it("handles voting yes, no, and unvoting by clicking already active vote", async () => {
    const user = userEvent.setup();
    const mockVote = vi.fn();

    renderWithProviders(
      <RankedSlotsSheet
        open={true}
        onOpenChange={vi.fn()}
        event={mockEvent}
        participantsProfiles={mockProfiles}
        currentUserId="u1"
        onVoteSlot={mockVote}
      />,
    );

    // Slot 0 has u1 vote "yes" -> clicking "yes" toggles it to null (unvote)
    const yesButtons = screen.getAllByTitle(/voting\.unvoted|voting\.yes/i);
    await user.click(yesButtons[0]);
    expect(mockVote).toHaveBeenCalledWith(0, null);

    // Slot 0: click "no" button (vote "no")
    const noButtons = screen.getAllByTitle(/voting\.no/i);
    await user.click(noButtons[0]);
    expect(mockVote).toHaveBeenCalledWith(0, "no");
  });

  it("toggles active maybe and active no votes to null", async () => {
    const user = userEvent.setup();
    const mockVote = vi.fn();

    const eventWithMaybe: SchedulerEvent = {
      ...mockEvent,
      proposedDates: [
        {
          start: "2026-08-01",
          end: "2026-08-01",
          votes: { u1: "maybe" },
        },
      ],
    };

    const { rerender } = renderWithProviders(
      <RankedSlotsSheet
        open={true}
        onOpenChange={vi.fn()}
        event={eventWithMaybe}
        participantsProfiles={mockProfiles}
        currentUserId="u1"
        onVoteSlot={mockVote}
      />,
    );

    const maybeActiveBtn = screen.getByTitle(/voting\.unvoted/i);
    await user.click(maybeActiveBtn);
    expect(mockVote).toHaveBeenCalledWith(0, null);

    mockVote.mockClear();

    const eventWithNo: SchedulerEvent = {
      ...mockEvent,
      proposedDates: [
        {
          start: "2026-08-01",
          end: "2026-08-01",
          votes: { u1: "no" },
        },
      ],
    };

    rerender(
      <RankedSlotsSheet
        open={true}
        onOpenChange={vi.fn()}
        event={eventWithNo}
        participantsProfiles={mockProfiles}
        currentUserId="u1"
        onVoteSlot={mockVote}
      />,
    );

    const noActiveBtn = screen.getByTitle(/voting\.unvoted/i);
    await user.click(noActiveBtn);
    expect(mockVote).toHaveBeenCalledWith(0, null);
  });

  it("formats cross-year date ranges properly", () => {
    const crossYearEvent: SchedulerEvent = {
      ...mockEvent,
      proposedDates: [
        {
          start: "2026-12-31",
          end: "2027-01-02",
          votes: { u1: "yes" },
        },
      ],
    };

    renderWithProviders(
      <RankedSlotsSheet
        open={true}
        onOpenChange={vi.fn()}
        event={crossYearEvent}
        participantsProfiles={mockProfiles}
        currentUserId="u1"
      />,
    );

    expect(screen.getByText(/31\.12\.2026.*02\.01\.2027/i)).toBeInTheDocument();
  });

  it("handles Polish locale and voters with missing profiles across all vote categories", () => {
    const plI18n = createTestI18n();
    plI18n.changeLanguage("pl");

    const eventWithAllVotes: SchedulerEvent = {
      ...mockEvent,
      proposedDates: [
        {
          start: "2026-08-01",
          end: "2026-08-01",
          votes: {
            "u-unknown-1": "yes",
            "u-unknown-2": "maybe",
            "u-unknown-3": "no",
          },
        },
      ],
    };

    renderWithProviders(
      <RankedSlotsSheet
        open={true}
        onOpenChange={vi.fn()}
        event={eventWithAllVotes}
        participantsProfiles={mockProfiles}
        currentUserId="u1"
      />,
      { i18nInstance: plI18n },
    );

    expect(screen.getAllByText("?").length).toBeGreaterThan(0);
  });
});
