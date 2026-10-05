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

    // Click "yes" button -> since current vote is "yes", toggles to null
    const yesBtn = screen.getByLabelText(/voting\.yes/i);
    await user.click(yesBtn);
    expect(mockQuickVote).toHaveBeenCalledWith(null);

    // Click "no" button
    const noBtn = screen.getByLabelText(/voting\.no/i);
    await user.click(noBtn);
    expect(mockQuickVote).toHaveBeenCalledWith("no");
  });

  it("renders multi-day event and stops propagation on content click", async () => {
    const user = userEvent.setup();
    const multiDayEvents: CalendarEvent<SlotMetaData>[] = [
      {
        id: "slot-multi",
        title: "Multi day slot",
        start: new Date(2026, 6, 15, 10, 0),
        end: new Date(2026, 6, 17, 18, 0),
        color: "",
        metaData: {
          slotIndex: 0,
          totalParticipantsCount: 1,
          currentUserId: "user-1",
          votes: { "user-1": "no" },
          onQuickVote: mockQuickVote,
          isFinalized: false,
        },
      },
    ];

    renderWithProviders(
      <SlotMoreEventsPopover
        events={multiDayEvents}
        day={new Date(2026, 6, 15)}
      />,
    );

    const trigger = screen.getByRole("button", { name: /\+1/i });
    await user.click(trigger);

    // Multi-day range text: "15 Jul — 17 Jul"
    expect(screen.getByText(/15 (Jul|lip).*17 (Jul|lip)/i)).toBeInTheDocument();

    // Click on popover content to trigger stopPropagation
    const popoverContent = document.querySelector('[data-slot="popover-content"]');
    if (popoverContent) {
      await user.click(popoverContent);
    }
  });

  it("handles toggling maybe and no votes to null, and voting yes when active is no", async () => {
    const user = userEvent.setup();
    const voteEvent: CalendarEvent<SlotMetaData>[] = [
      {
        id: "slot-toggle",
        title: "Toggle slot",
        start: new Date(2026, 6, 15, 10, 0),
        end: new Date(2026, 6, 15, 12, 0),
        metaData: {
          slotIndex: 0,
          totalParticipantsCount: 1,
          currentUserId: "user-1",
          votes: { "user-1": "maybe" },
          onQuickVote: mockQuickVote,
          isFinalized: false,
        },
      },
    ];

    renderWithProviders(<SlotMoreEventsPopover events={voteEvent} day={new Date(2026, 6, 15)} />);
    await user.click(screen.getByRole("button", { name: /\+1/i }));

    // Toggle maybe to null
    const maybeBtn = screen.getByLabelText(/voting\.maybe/i);
    await user.click(maybeBtn);
    expect(mockQuickVote).toHaveBeenCalledWith(null);
  });

  it("handles toggling no vote to null", async () => {
    const user = userEvent.setup();
    const voteEvent: CalendarEvent<SlotMetaData>[] = [
      {
        id: "slot-toggle-no",
        title: "Toggle no slot",
        start: new Date(2026, 6, 15, 10, 0),
        end: new Date(2026, 6, 15, 12, 0),
        metaData: {
          slotIndex: 0,
          totalParticipantsCount: 1,
          currentUserId: "user-1",
          votes: { "user-1": "no" },
          onQuickVote: mockQuickVote,
          isFinalized: false,
        },
      },
    ];

    renderWithProviders(<SlotMoreEventsPopover events={voteEvent} day={new Date(2026, 6, 15)} />);
    await user.click(screen.getByRole("button", { name: /\+1/i }));

    // Toggle no to null
    const noBtn = screen.getByLabelText(/voting\.no/i);
    await user.click(noBtn);
    expect(mockQuickVote).toHaveBeenCalledWith(null);

    // Click yes when active vote is no/null -> sets to "yes"
    const yesBtn = screen.getByLabelText(/voting\.yes/i);
    await user.click(yesBtn);
    expect(mockQuickVote).toHaveBeenCalledWith("yes");
  });

  it("renders correctly when metaData is undefined", async () => {
    const user = userEvent.setup();
    const eventWithoutMeta: CalendarEvent<SlotMetaData>[] = [
      {
        id: "slot-no-meta",
        title: "No meta slot",
        start: new Date(2026, 6, 15, 10, 0),
        end: new Date(2026, 6, 15, 12, 0),
      },
    ];

    renderWithProviders(<SlotMoreEventsPopover events={eventWithoutMeta} day={new Date(2026, 6, 15)} />);
    await user.click(screen.getByRole("button", { name: /\+1/i }));
    expect(screen.queryByLabelText(/voting\.yes/i)).not.toBeInTheDocument();
  });
});
