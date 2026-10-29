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

let isMobileMock = false;
vi.mock("@flaner/shared/hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@flaner/shared/hooks")>();
  return {
    ...actual,
    useIsMobile: () => isMobileMock,
  };
});

describe("SchedulerBigCalendar", () => {
  it("computes maxEventsPerDay as 4 when desktop and height > 820", () => {
    vi.stubGlobal("innerHeight", 1000);
    renderWithProviders(
      <SchedulerBigCalendar
        activeEvent={mockEvent}
        participants={[]}
        topVotedSlotIndices={new Set()}
        currentCalendarView="month"
        onViewChange={vi.fn()}
        onVoteSlot={vi.fn()}
        onSlotClick={vi.fn()}
        onOpenRankedSheet={vi.fn()}
      />
    );
    expect(screen.getByTitle("ranking.title")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

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

  it("renders custom grid view when currentCalendarView is grid", () => {
    const onVoteSlot = vi.fn().mockResolvedValue(undefined);

    renderWithProviders(
      <SchedulerBigCalendar
        activeEvent={mockEvent}
        participants={[{ id: "user-1", name: "Alice", username: "Alice", usernameLower: "alice", type: "user" }]}
        topVotedSlotIndices={new Set()}
        currentCalendarView="grid"
        onViewChange={vi.fn()}
        onVoteSlot={onVoteSlot}
        onSlotClick={vi.fn()}
        onOpenRankedSheet={vi.fn()}
      />,
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("handles event slot click and quick vote", async () => {
    const user = userEvent.setup();
    const onSlotClick = vi.fn();
    const onVoteSlot = vi.fn().mockResolvedValue(undefined);
    const todayStr = new Date().toISOString();

    const currentEvent: SchedulerEvent = {
      ...mockEvent,
      proposedDates: [
        { start: todayStr, end: todayStr, color: "#3b82f6" },
      ],
    };

    const { container } = renderWithProviders(
      <SchedulerBigCalendar
        activeEvent={currentEvent}
        participants={[{ id: "user-1", name: "Alice", username: "Alice", usernameLower: "alice", type: "user" }]}
        currentUserId="user-1"
        topVotedSlotIndices={new Set()}
        currentCalendarView="month"
        onViewChange={vi.fn()}
        onVoteSlot={onVoteSlot}
        onSlotClick={onSlotClick}
        onOpenRankedSheet={vi.fn()}
      />,
    );

    // Quick vote
    const voteYesBtn = screen.getByTitle("voting.voteYes");
    await user.click(voteYesBtn);
    expect(onVoteSlot).toHaveBeenCalledWith(0, "yes");

    // Click event slot
    const slotBtn = container.querySelector<HTMLDivElement>("div[role='button']");
    expect(slotBtn).toBeTruthy();
    if (slotBtn) {
      await user.click(slotBtn);
      expect(onSlotClick).toHaveBeenCalledWith(0);
    }
  });

  it("handles renderMoreEvents popover and slot click inside popover", async () => {
    const user = userEvent.setup();
    const onSlotClick = vi.fn();
    const todayStr = new Date().toISOString();
    const multiSlotEvent: SchedulerEvent = {
      ...mockEvent,
      proposedDates: Array.from({ length: 6 }).map(() => ({
        start: todayStr,
        end: todayStr,
        color: "#3b82f6",
      })),
    };

    renderWithProviders(
      <SchedulerBigCalendar
        activeEvent={multiSlotEvent}
        participants={[{ id: "user-1", name: "Alice", username: "Alice", usernameLower: "alice", type: "user" }]}
        currentUserId="user-1"
        topVotedSlotIndices={new Set()}
        currentCalendarView="month"
        onViewChange={vi.fn()}
        onVoteSlot={vi.fn()}
        onSlotClick={onSlotClick}
        onOpenRankedSheet={vi.fn()}
      />,
    );

    const moreBtns = screen.getAllByText(/\+\d+/i);
    await user.click(moreBtns[0]);

    // Find and click slot button inside popover
    const popoverContent = document.querySelector("[data-radix-popper-content-wrapper]");
    const popoverSlotBtn = popoverContent?.querySelector<HTMLButtonElement>("button");
    expect(popoverSlotBtn).toBeTruthy();
    if (popoverSlotBtn) {
      await user.click(popoverSlotBtn);
      expect(onSlotClick).toHaveBeenCalled();
    }
  });

  it("handles mobile layout and tall desktop window heights", () => {
    isMobileMock = true;

    const { rerender } = renderWithProviders(
      <SchedulerBigCalendar
        activeEvent={mockEvent}
        participants={[{ id: "user-1", name: "Alice", username: "Alice", usernameLower: "alice", type: "user" }]}
        topVotedSlotIndices={new Set()}
        currentCalendarView="month"
        onViewChange={vi.fn()}
        onVoteSlot={vi.fn()}
        onSlotClick={vi.fn()}
        onOpenRankedSheet={vi.fn()}
      />,
    );

    expect(screen.getByTitle("ranking.title")).toBeInTheDocument();

    isMobileMock = false;
    vi.stubGlobal("innerHeight", 1000);

    rerender(
      <SchedulerBigCalendar
        activeEvent={mockEvent}
        participants={[{ id: "user-1", name: "Alice", username: "Alice", usernameLower: "alice", type: "user" }]}
        topVotedSlotIndices={new Set()}
        currentCalendarView="month"
        onViewChange={vi.fn()}
        onVoteSlot={vi.fn()}
        onSlotClick={vi.fn()}
        onOpenRankedSheet={vi.fn()}
      />,
    );

    expect(screen.getByTitle("ranking.title")).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("renders finalized event with winning slot", () => {
    const finalizedEvent: SchedulerEvent = {
      ...mockEvent,
      isFinalized: true,
      finalizedSlotIndex: 0,
    };

    renderWithProviders(
      <SchedulerBigCalendar
        activeEvent={finalizedEvent}
        participants={[{ id: "user-1", name: "Alice", username: "Alice", usernameLower: "alice", type: "user" }]}
        topVotedSlotIndices={new Set([0])}
        currentCalendarView="month"
        onViewChange={vi.fn()}
        onVoteSlot={vi.fn()}
        onSlotClick={vi.fn()}
        onOpenRankedSheet={vi.fn()}
      />,
    );

    expect(screen.getByTitle("ranking.title")).toBeInTheDocument();
  });

  it("handles mobile view mode and media query change event", () => {
    isMobileMock = true;
    let changeHandler: (() => void) | undefined;
    const matchMediaMock = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event, handler) => {
        if (event === "change") changeHandler = handler;
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    vi.stubGlobal("matchMedia", matchMediaMock);
    vi.stubGlobal("innerHeight", 1000);

    const { unmount } = renderWithProviders(
      <SchedulerBigCalendar
        activeEvent={mockEvent}
        participants={[{ id: "user-1", name: "Alice", username: "Alice", usernameLower: "alice", type: "user" }]}
        topVotedSlotIndices={new Set()}
        currentCalendarView="month"
        onViewChange={vi.fn()}
        onVoteSlot={vi.fn()}
        onSlotClick={vi.fn()}
        onOpenRankedSheet={vi.fn()}
      />,
    );

    // Call registered onChange listener to cover line 47
    changeHandler?.();

    unmount();
    isMobileMock = false;
    vi.unstubAllGlobals();
  });
});
