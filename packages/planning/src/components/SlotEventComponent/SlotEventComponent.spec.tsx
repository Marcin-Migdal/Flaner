import { describe, expect, it, vi } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
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

    if (slotTitle.parentElement) {
      fireEvent.keyDown(slotTitle.parentElement, { key: " " });
      expect(mockClick).toHaveBeenCalledTimes(2);
    }
  });

  it("renders empty slot when hovered and without color", () => {
    const emptyEvent: CalendarEvent<SlotMetaData> = {
      id: "slot-empty-2",
      title: "No Meta Slot 2",
      start: new Date(2026, 6, 10),
      end: new Date(2026, 6, 12),
    };

    renderWithProviders(
      <SlotEventComponent
        {...defaultProps}
        event={emptyEvent}
        isHovered={true}
      />,
    );

    expect(screen.getByText("No Meta Slot 2")).toBeInTheDocument();
  });

  it("renders slot when currentUserId is undefined", () => {
    const noUserEvent: CalendarEvent<SlotMetaData> = {
      ...baseEvent,
      metaData: {
        ...baseMetaData,
        currentUserId: undefined,
      },
    };

    renderWithProviders(
      <SlotEventComponent
        {...defaultProps}
        event={noUserEvent}
      />,
    );

    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
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

  it("handles keyboard Enter and Space navigation on slot", () => {
    const onClick = vi.fn();

    renderWithProviders(
      <SlotEventComponent
        {...defaultProps}
        event={baseEvent}
        onClick={onClick}
      />,
    );

    const slot = document.querySelector<HTMLDivElement>('div[role="button"]');
    expect(slot).toBeInTheDocument();
    if (slot) {
      fireEvent.keyDown(slot, { key: "Enter" });
      expect(onClick).toHaveBeenCalledTimes(1);

      fireEvent.keyDown(slot, { key: " " });
      expect(onClick).toHaveBeenCalledTimes(2);
    }

    fireEvent.keyDown(slot, { key: "Escape" });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("handles quick vote yes (toggle off) and no clicks", async () => {
    const user = userEvent.setup();
    mockQuickVote.mockClear();

    renderWithProviders(
      <SlotEventComponent
        {...defaultProps}
        event={baseEvent}
      />,
    );

    // Current vote is "yes" -> clicking "yes" calls with null (retract vote)
    const yesButton = screen.getByTitle(/voting\.retractVote/i);
    await user.click(yesButton);
    expect(mockQuickVote).toHaveBeenCalledWith(null);

    // Click "no" button
    const noButton = screen.getByTitle(/voting\.voteNo/i);
    await user.click(noButton);
    expect(mockQuickVote).toHaveBeenCalledWith("no");
  });

  it("renders badges for various voting distributions (maybe only, no only, 0 votes)", () => {
    // Maybe only
    const maybeOnlyEvent: CalendarEvent<SlotMetaData> = {
      ...baseEvent,
      metaData: {
        ...baseMetaData,
        votes: { "user-2": "maybe" },
      },
    };
    const { rerender } = renderWithProviders(
      <SlotEventComponent {...defaultProps} event={maybeOnlyEvent} />,
    );
    expect(screen.getAllByText("?").length).toBeGreaterThan(0);

    // No only
    const noOnlyEvent: CalendarEvent<SlotMetaData> = {
      ...baseEvent,
      metaData: {
        ...baseMetaData,
        votes: { "user-2": "no" },
      },
    };
    rerender(<SlotEventComponent {...defaultProps} event={noOnlyEvent} />);
    expect(screen.getAllByText("✕").length).toBeGreaterThan(0);

    // Zero votes
    const zeroVotesEvent: CalendarEvent<SlotMetaData> = {
      ...baseEvent,
      metaData: {
        ...baseMetaData,
        votes: {},
      },
    };
    rerender(<SlotEventComponent {...defaultProps} event={zeroVotesEvent} />);
    expect(screen.getAllByText("0/2").length).toBeGreaterThan(0);

    // isFirstSegment = false (badge hidden)
    rerender(<SlotEventComponent {...defaultProps} isFirstSegment={false} event={zeroVotesEvent} />);
    expect(screen.queryByText("0/2")).not.toBeInTheDocument();
  });

  it("handles currentUserVote as maybe and no with retraction and active badges", async () => {
    const user = userEvent.setup();
    mockQuickVote.mockClear();

    // 1. currentUser has "maybe" vote
    const maybeUserEvent: CalendarEvent<SlotMetaData> = {
      ...baseEvent,
      metaData: {
        ...baseMetaData,
        votes: { "user-1": "maybe" },
      },
    };

    const { rerender } = renderWithProviders(
      <SlotEventComponent {...defaultProps} isFirstInRow={true} isFirstSegment={false} event={maybeUserEvent} />,
    );

    // Retract maybe vote
    const retractMaybeBtn = screen.getByTitle(/voting\.retractVote/i);
    await user.click(retractMaybeBtn);
    expect(mockQuickVote).toHaveBeenCalledWith(null);

    // Vote yes when current is maybe
    const voteYesBtn = screen.getByTitle(/voting\.voteYes/i);
    await user.click(voteYesBtn);
    expect(mockQuickVote).toHaveBeenCalledWith("yes");

    // 2. currentUser has "no" vote
    const noUserEvent: CalendarEvent<SlotMetaData> = {
      ...baseEvent,
      metaData: {
        ...baseMetaData,
        votes: { "user-1": "no" },
      },
    };

    rerender(<SlotEventComponent {...defaultProps} event={noUserEvent} />);

    // Retract no vote
    const retractNoBtn = screen.getByTitle(/voting\.retractVote/i);
    await user.click(retractNoBtn);
    expect(mockQuickVote).toHaveBeenCalledWith(null);
  });

  it("renders with winning slot, top voted, hovered, and continuesNextInRow props", () => {
    const winningEvent: CalendarEvent<SlotMetaData> = {
      ...baseEvent,
      color: undefined, // test fallback color
      metaData: {
        ...baseMetaData,
        isWinningSlot: true,
      },
    };

    const { rerender } = renderWithProviders(
      <SlotEventComponent
        {...defaultProps}
        event={winningEvent}
        isHovered={true}
        continuesNextInRow={true}
      />,
    );

    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);

    const topVotedEvent: CalendarEvent<SlotMetaData> = {
      ...baseEvent,
      metaData: {
        ...baseMetaData,
        isTopVoted: true,
      },
    };

    rerender(<SlotEventComponent {...defaultProps} event={topVotedEvent} isHovered={true} />);
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });
});
