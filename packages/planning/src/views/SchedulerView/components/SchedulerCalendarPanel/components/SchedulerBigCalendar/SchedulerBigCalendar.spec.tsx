import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../../../../../api/events/types";
import { SchedulerBigCalendar } from "./SchedulerBigCalendar";

const mockEvent: SchedulerEvent = {
  id: "ev-1",
  name: "Game Night",
  description: "Board games",
  creatorId: "user-1",
  participants: ["user-1"],
  proposedDates: [
    { start: "2026-06-01T18:00:00Z", end: "2026-06-01T21:00:00Z", color: "#3b82f6" },
  ],
  isFinalized: false,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

describe("SchedulerBigCalendar", () => {
  it("renders calendar and triggers onOpenRankedSheet on click", async () => {
    const user = userEvent.setup();
    const onOpenRankedSheet = vi.fn();

    renderWithProviders(
      <SchedulerBigCalendar
        activeEvent={mockEvent}
        participants={[{ id: "user-1", name: "Alice", username: "Alice", usernameLower: "alice", type: "user" }]}
        topVotedSlotIndices={new Set()}
        currentCalendarView="month"
        onViewChange={vi.fn()}
        onVoteSlot={vi.fn().mockResolvedValue(undefined)}
        onSlotClick={vi.fn()}
        onOpenRankedSheet={onOpenRankedSheet}
      />,
    );

    const rankButton = screen.getByTitle("ranking.title");
    await user.click(rankButton);

    expect(onOpenRankedSheet).toHaveBeenCalled();
  });
});
