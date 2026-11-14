import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockUser, renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../../../api/events/types";
import type { ParticipantResult } from "../../../../api/participants";
import { SchedulerCalendarPanel } from "./SchedulerCalendarPanel";

const signedInUser = createMockUser({ uid: "u1", username: "Alice", email: "alice@flaner.app" });

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
    topVotedSlotIndices,
  }: {
    topVotedSlotIndices: Set<number>;
    onVoteSlot: (slotIndex: number, vote: "yes" | "no" | "maybe" | null) => Promise<void>;
    onSlotClick: (slotIndex: number) => void;
    onOpenRankedSheet: () => void;
  }) => (
    <div data-testid="mock-big-calendar" data-top-voted={[...topVotedSlotIndices].join(",")}>
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
        color: "blue",
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
      { user: signedInUser },
    );

    expect(screen.getByText("hub.noEvents")).toBeInTheDocument();
  });

  it("handles voting, slot modal open/close, and ranked sheet open", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SchedulerCalendarPanel activeEvent={mockEvent} participants={mockParticipants} />,
      { user: signedInUser },
    );

    // Trigger Vote
    const voteBtn = screen.getByText("Trigger Vote");
    await user.click(voteBtn);
    expect(mockVoteSlot).toHaveBeenCalledWith({
      eventId: "evt-cal",
      slotKey: "2026-08-10_2026-08-11",
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
      finalizedSlotKey: "2026-08-10_2026-08-11",
    };

    renderWithProviders(
      <SchedulerCalendarPanel activeEvent={finalizedEvent} participants={mockParticipants} />,
      { user: signedInUser },
    );

    const voteBtn = screen.getByText("Trigger Vote");
    await user.click(voteBtn);
    expect(mockVoteSlot).not.toHaveBeenCalled();
  });

  it("highlights the top-voted slot only while the event is open (#106)", () => {
    const { rerender } = renderWithProviders(
      <SchedulerCalendarPanel activeEvent={mockEvent} participants={mockParticipants} />,
      { user: signedInUser },
    );
    expect(screen.getByTestId("mock-big-calendar")).toHaveAttribute("data-top-voted", "0");

    rerender(
      <SchedulerCalendarPanel
        activeEvent={{ ...mockEvent, isFinalized: true, finalizedSlotKey: "2026-08-10_2026-08-11" }}
        participants={mockParticipants}
      />,
    );
    expect(screen.getByTestId("mock-big-calendar")).toHaveAttribute("data-top-voted", "");
  });

  it("does not open the voting modal on slot click when activeEvent is finalized", async () => {
    const user = userEvent.setup();
    const finalizedEvent: SchedulerEvent = {
      ...mockEvent,
      isFinalized: true,
      finalizedSlotKey: "2026-08-10_2026-08-11",
    };

    renderWithProviders(
      <SchedulerCalendarPanel activeEvent={finalizedEvent} participants={mockParticipants} />,
      { user: signedInUser },
    );

    await user.click(screen.getByText("Trigger Slot Click"));
    expect(screen.queryByText("voting.yourVote")).not.toBeInTheDocument();
  });
});
