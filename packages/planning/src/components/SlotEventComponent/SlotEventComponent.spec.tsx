import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { CalendarEvent, CalendarEventComponentProps } from "@flaner/ui-components";
import { SlotEventComponent, type SlotMetaData } from "./SlotEventComponent";

describe("SlotEventComponent", () => {
  const mockQuickVote = vi.fn();
  const mockClick = vi.fn();

  const baseMetaData: SlotMetaData = {
    slotIndex: 0,
    votes: {
      "user-1": "yes",
      "user-2": "maybe",
    },
    totalParticipantsCount: 2,
    currentUserId: "user-1",
    onQuickVote: mockQuickVote,
    isFinalized: false,
  };

  const baseEvent: CalendarEvent<SlotMetaData> = {
    id: "slot-1",
    title: "Slot 1",
    start: new Date(2026, 6, 10),
    end: new Date(2026, 6, 12),
    color: "#3b82f6",
    metaData: baseMetaData,
  };

  const defaultProps: CalendarEventComponentProps<SlotMetaData> = {
    event: baseEvent,
    isFirstSegment: true,
    isLastSegment: true,
    isHovered: false,
    className: "",
    onMouseEnter: vi.fn(),
    onMouseLeave: vi.fn(),
    onClick: mockClick,
  };

  it("renders empty slot when metaData is missing and handles click", async () => {
    const user = userEvent.setup();
    const emptyEvent: CalendarEvent<SlotMetaData> = {
      id: "slot-empty",
      title: "No Meta Slot",
      start: new Date(2026, 6, 10),
      end: new Date(2026, 6, 12),
    };

    renderWithProviders(
      <SlotEventComponent
        {...defaultProps}
        event={emptyEvent}
        onClick={mockClick}
      />,
    );

    const slotTitle = screen.getByText("No Meta Slot");
    expect(slotTitle).toBeInTheDocument();
    await user.click(slotTitle);
    expect(mockClick).toHaveBeenCalled();
  });

  it("renders slot with active vote badge and yes vote counts", () => {
    renderWithProviders(
      <SlotEventComponent
        {...defaultProps}
        event={baseEvent}
      />,
    );

    expect(screen.getAllByText("✓").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
  });

  it("calls onQuickVote when quick vote button is clicked", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SlotEventComponent
        {...defaultProps}
        event={baseEvent}
      />,
    );

    const maybeButton = screen.getByTitle(/voting\.voteMaybe/i);
    await user.click(maybeButton);

    expect(mockQuickVote).toHaveBeenCalledWith("maybe");
  });

  it("does not render quick-vote toolbar when slot is finalized", () => {
    const finalizedEvent: CalendarEvent<SlotMetaData> = {
      ...baseEvent,
      metaData: {
        ...baseMetaData,
        isFinalized: true,
      },
    };

    renderWithProviders(
      <SlotEventComponent
        {...defaultProps}
        event={finalizedEvent}
      />,
    );

    expect(screen.queryByTitle(/voting\.voteMaybe/i)).not.toBeInTheDocument();
  });
});
