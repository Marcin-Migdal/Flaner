import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../../../../../api/events/types";
import { SchedulerEventHeader } from "./SchedulerEventHeader";

const mockEvent: SchedulerEvent = {
  id: "ev-1",
  name: "Summer Camp",
  description: "Camping trip",
  creatorId: "user-1",
  participants: ["user-1"],
  proposedDates: [
    { start: "2026-07-01T10:00:00Z", end: "2026-07-03T18:00:00Z", color: "#3b82f6" },
  ],
  isFinalized: false,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

describe("SchedulerEventHeader", () => {
  it("renders event header with select and creates event on button click", async () => {
    const user = userEvent.setup();
    const onCreateEventClick = vi.fn();

    renderWithProviders(
      <SchedulerEventHeader
        events={[mockEvent]}
        isEventsLoading={false}
        activeEvent={mockEvent}
        currentUserId="user-1"
        isOwner={true}
        onCreateEventClick={onCreateEventClick}
        onSelectEvent={vi.fn()}
        onEditEvent={vi.fn()}
        onDeleteEvent={vi.fn()}
        onFinalizeClick={vi.fn()}
        onReopenClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Summer Camp")).toBeInTheDocument();

    const addBtn = screen.getByTitle("hub.addEvent");
    await user.click(addBtn);

    expect(onCreateEventClick).toHaveBeenCalled();
  });

  it("calls onRejectUnvoted when reject unvoted button is clicked", async () => {
    const user = userEvent.setup();
    const onRejectUnvoted = vi.fn();

    renderWithProviders(
      <SchedulerEventHeader
        events={[mockEvent]}
        isEventsLoading={false}
        activeEvent={mockEvent}
        currentUserId="user-1"
        isOwner={true}
        unvotedCount={2}
        onRejectUnvoted={onRejectUnvoted}
        onCreateEventClick={vi.fn()}
        onSelectEvent={vi.fn()}
        onEditEvent={vi.fn()}
        onDeleteEvent={vi.fn()}
        onFinalizeClick={vi.fn()}
        onReopenClick={vi.fn()}
      />,
    );

    const rejectBtn = screen.getByRole("button", { name: /actions.rejectUnvoted/i });
    await user.click(rejectBtn);

    expect(onRejectUnvoted).toHaveBeenCalled();
  });
});
