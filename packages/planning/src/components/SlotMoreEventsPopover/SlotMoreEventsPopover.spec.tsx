import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { CalendarEvent } from "@flaner/ui-components";
import type { SlotMetaData } from "../SlotEventComponent";
import { SlotMoreEventsPopover } from "./SlotMoreEventsPopover";

describe("SlotMoreEventsPopover", () => {
  const mockQuickVote = vi.fn();
  const mockSlotClick = vi.fn();

  const mockEvents: CalendarEvent<SlotMetaData>[] = [
    {
      id: "slot-1",
      title: "Slot 1",
      start: new Date(2026, 6, 15, 10, 0),
      end: new Date(2026, 6, 15, 12, 0),
      color: "#3b82f6",
      metaData: {
        slotIndex: 0,
        totalParticipantsCount: 1,
        currentUserId: "user-1",
        votes: { "user-1": "yes" },
        onQuickVote: mockQuickVote,
        isFinalized: false,
      },
    },
  ];

  it("returns null when events array is empty", () => {
    const { container } = renderWithProviders(
      <SlotMoreEventsPopover events={[]} day={new Date(2026, 6, 15)} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders trigger button with count and opens popover content", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SlotMoreEventsPopover
        events={mockEvents}
        day={new Date(2026, 6, 15)}
        onSlotClick={mockSlotClick}
      />,
    );

    const trigger = screen.getByRole("button", { name: /\+1/i });
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);

    // After opening, range text and voting buttons are visible
    const slotButton = screen.getByRole("button", { name: /15 (Jul|lip)/i });
    expect(slotButton).toBeInTheDocument();

    // Click slot item
    await user.click(slotButton);
    expect(mockSlotClick).toHaveBeenCalledWith(mockEvents[0]);
  });

  it("triggers quick-vote when vote buttons are clicked", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SlotMoreEventsPopover
        events={mockEvents}
        day={new Date(2026, 6, 15)}
      />,
    );

    const trigger = screen.getByRole("button", { name: /\+1/i });
    await user.click(trigger);

    // Vote button with aria-label voting.maybe
    const maybeBtn = screen.getByLabelText(/voting\.maybe/i);
    await user.click(maybeBtn);
    expect(mockQuickVote).toHaveBeenCalledWith("maybe");
  });
});
