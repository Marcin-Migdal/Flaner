import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../../../api/events/types";
import type { ParticipantResult } from "../../../../api/participants";
import { SchedulerCalendarPanel } from "./SchedulerCalendarPanel";

const mockUser = { uid: "u1", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockVoteSlot = vi.fn();
vi.mock("../../../../hooks/api/mutation", () => ({
  useVoteSlotMutation: () => ({
    mutateAsync: mockVoteSlot,
    isPending: false,
  }),
}));

vi.mock("./components/SchedulerBigCalendar", () => ({
  SchedulerBigCalendar: ({
    onVoteSlot,
    onSlotClick,
    onOpenRankedSheet,
  }: {
    onVoteSlot: (slotIndex: number, vote: "yes" | "no" | "maybe" | null) => Promise<void>;
    onSlotClick: (slotIndex: number) => void;
    onOpenRankedSheet: () => void;
  }) => (
    <div data-testid="mock-big-calendar">
      <button type="button" onClick={() => onVoteSlot(0, "yes")}>Trigger Vote</button>
      <button type="button" onClick={() => onSlotClick(0)}>Trigger Slot Click</button>
      <button type="button" onClick={onOpenRankedSheet}>Trigger Ranked Sheet</button>
    </div>
  ),
}));

describe("SchedulerCalendarPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockEvent: SchedulerEvent = {
    id: "evt-cal",
    name: "Sprint Demo",
    description: "Review sprint deliverables",
    creatorId: "u1",
    participants: ["u1", "u2"],
    proposedDates: [
      {
        start: "2026-08-10",
        end: "2026-08-11",
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
  ];

  it("renders empty state when activeEvent is null", () => {
    renderWithProviders(
      <SchedulerCalendarPanel activeEvent={null} participants={[]} />,
    );

    expect(screen.getByText("hub.noEvents")).toBeInTheDocument();
  });

  it("handles voting, slot modal open/close, and ranked sheet open", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SchedulerCalendarPanel activeEvent={mockEvent} participants={mockParticipants} />,
    );

    // Trigger Vote
    const voteBtn = screen.getByText("Trigger Vote");
    await user.click(voteBtn);
    expect(mockVoteSlot).toHaveBeenCalledWith({
      eventId: "evt-cal",
      slotIndex: 0,
      userId: "u1",
      vote: "yes",
    });

    // Trigger Slot Click -> opens SlotVotingModal
    const slotClickBtn = screen.getByText("Trigger Slot Click");
    await user.click(slotClickBtn);
    expect(screen.getByText("voting.yourVote")).toBeInTheDocument();

    // Close SlotVotingModal via Escape
    await user.keyboard("{Escape}");
    expect(screen.queryByText("voting.yourVote")).not.toBeInTheDocument();

    // Trigger Ranked Sheet
    const rankedBtn = screen.getByText("Trigger Ranked Sheet");
    await user.click(rankedBtn);
    expect(screen.getByText("rankedSheet.eyebrow")).toBeInTheDocument();
  });

  it("does not call voteSlot when activeEvent is finalized", async () => {
    const user = userEvent.setup();
    const finalizedEvent: SchedulerEvent = {
      ...mockEvent,
      isFinalized: true,
      finalizedSlotIndex: 0,
    };

    renderWithProviders(
      <SchedulerCalendarPanel activeEvent={finalizedEvent} participants={mockParticipants} />,
    );

    const voteBtn = screen.getByText("Trigger Vote");
    await user.click(voteBtn);
    expect(mockVoteSlot).not.toHaveBeenCalled();
  });
});
