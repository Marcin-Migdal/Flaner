import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../../../../../api/events/types";
import { SchedulerEventHeader } from "./SchedulerEventHeader";

const getMenu = () => {
  const menu = document.querySelector<HTMLElement>(".react-select__menu");
  if (!menu) throw new Error("Select menu is not open");
  return menu;
};

const mockEvent: SchedulerEvent = {
  id: "ev-1",
  name: "Summer Camp",
  description: "Camping trip",
  creatorId: "user-1",
  participants: ["user-1"],
  proposedDates: [
    { start: "2026-07-01T10:00:00Z", end: "2026-07-03T18:00:00Z", color: "blue" },
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

  it("renders loading skeleton when isEventsLoading is true and empty state when events is empty", () => {
    const { rerender } = renderWithProviders(
      <SchedulerEventHeader
        events={[]}
        isEventsLoading={true}
        activeEvent={null}
        isOwner={false}
        onCreateEventClick={vi.fn()}
        onSelectEvent={vi.fn()}
        onEditEvent={vi.fn()}
        onDeleteEvent={vi.fn()}
        onFinalizeClick={vi.fn()}
        onReopenClick={vi.fn()}
      />,
    );

    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();

    rerender(
      <SchedulerEventHeader
        events={[]}
        isEventsLoading={false}
        activeEvent={null}
        isOwner={false}
        onCreateEventClick={vi.fn()}
        onSelectEvent={vi.fn()}
        onEditEvent={vi.fn()}
        onDeleteEvent={vi.fn()}
        onFinalizeClick={vi.fn()}
        onReopenClick={vi.fn()}
      />,
    );

    expect(screen.getByText("hub.noEvents")).toBeInTheDocument();
  });

  it("handles event selection and menu option edit/delete buttons", async () => {
    const user = userEvent.setup();
    const onSelectEvent = vi.fn();
    const onEditEvent = vi.fn();
    const onDeleteEvent = vi.fn();

    const secondEvent: SchedulerEvent = {
      ...mockEvent,
      id: "ev-2",
      name: "Autumn Hike",
    };

    renderWithProviders(
      <SchedulerEventHeader
        events={[mockEvent, secondEvent]}
        isEventsLoading={false}
        activeEvent={mockEvent}
        currentUserId="user-1"
        isOwner={true}
        onSelectEvent={onSelectEvent}
        onEditEvent={onEditEvent}
        onDeleteEvent={onDeleteEvent}
        onCreateEventClick={vi.fn()}
        onFinalizeClick={vi.fn()}
        onReopenClick={vi.fn()}
      />,
    );

    // Open Select dropdown via keyboard or mouseDown on control
    const combobox = screen.getByRole("combobox");
    fireEvent.keyDown(combobox, { key: "ArrowDown" });

    // The menu options' edit / delete buttons are named, so they are reachable by role (#99); the first option is Summer Camp
    await user.click(within(getMenu()).getAllByRole("button", { name: "actions.edit" })[0]);
    expect(onEditEvent).toHaveBeenCalledWith(mockEvent, expect.anything());

    // Reopen menu for delete button since edit click closed menu
    fireEvent.keyDown(combobox, { key: "ArrowDown" });
    await user.click(within(getMenu()).getAllByRole("button", { name: "actions.delete" })[0]);
    expect(onDeleteEvent).toHaveBeenCalledWith({ id: "ev-1", name: "Summer Camp" });

    // Select second event
    const secondOption = await screen.findByText("Autumn Hike");
    await user.click(secondOption);
    expect(onSelectEvent).toHaveBeenCalledWith("ev-2");
  });

  it("handles finalize button, finalized card with reopen, and mobile action buttons", async () => {
    const user = userEvent.setup();
    const onFinalizeClick = vi.fn();
    const onReopenClick = vi.fn();
    const onEditEvent = vi.fn();
    const onDeleteEvent = vi.fn();

    const { rerender } = renderWithProviders(
      <SchedulerEventHeader
        events={[mockEvent]}
        isEventsLoading={false}
        activeEvent={mockEvent}
        currentUserId="user-1"
        isOwner={true}
        unvotedCount={0}
        onFinalizeClick={onFinalizeClick}
        onReopenClick={onReopenClick}
        onEditEvent={onEditEvent}
        onDeleteEvent={onDeleteEvent}
        onCreateEventClick={vi.fn()}
        onSelectEvent={vi.fn()}
      />,
    );

    // Click Finalize Event button
    const finalizeBtn = screen.getByRole("button", { name: /actions.finalizeEvent/i });
    await user.click(finalizeBtn);
    expect(onFinalizeClick).toHaveBeenCalled();

    // Click mobile edit and delete buttons (with title actions.edit / actions.delete)
    const mobileEditBtn = screen.getByTitle("actions.edit");
    await user.click(mobileEditBtn);
    expect(onEditEvent).toHaveBeenCalled();

    const mobileDeleteBtn = screen.getByTitle("actions.delete");
    await user.click(mobileDeleteBtn);
    expect(onDeleteEvent).toHaveBeenCalled();

    // Re-render as finalized event
    const finalizedEvent: SchedulerEvent = {
      ...mockEvent,
      isFinalized: true,
      finalizedSlotKey: "2026-07-01T10:00:00Z_2026-07-03T18:00:00Z",
    };

    rerender(
      <SchedulerEventHeader
        events={[finalizedEvent]}
        isEventsLoading={false}
        activeEvent={finalizedEvent}
        currentUserId="user-1"
        isOwner={true}
        onFinalizeClick={onFinalizeClick}
        onReopenClick={onReopenClick}
        onEditEvent={onEditEvent}
        onDeleteEvent={onDeleteEvent}
        onCreateEventClick={vi.fn()}
        onSelectEvent={vi.fn()}
      />,
    );

    // FinalizedDateCard should be present and handle reopen
    const reopenBtn = screen.getByRole("button", { name: /actions\.reopenVoting/i });
    await user.click(reopenBtn);
    expect(onReopenClick).toHaveBeenCalled();
  });
});
