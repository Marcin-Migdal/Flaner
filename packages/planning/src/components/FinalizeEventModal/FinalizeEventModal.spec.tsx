import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../api/events/types";
import { FinalizeEventModal } from "./FinalizeEventModal";

let mockIsPending = false;
const mockFinalizeMutateAsync = vi.fn();

vi.mock("../../hooks/api/mutation/useFinalizeEventMutation", () => ({
  useFinalizeEventMutation: () => ({
    mutateAsync: mockFinalizeMutateAsync,
    get isPending() {
      return mockIsPending;
    },
  }),
}));

describe("FinalizeEventModal", () => {
  const mockEvent: SchedulerEvent = {
    id: "evt-123",
    name: "Team Planning",
    description: "Quarterly alignment",
    creatorId: "user-1",
    participants: ["user-1", "user-2", "user-3"],
    proposedDates: [
      {
        start: "2026-07-01",
        end: "2026-07-01",
        color: "blue",
        votes: {
          "user-1": "yes",
          "user-2": "maybe",
        },
      },
      {
        start: "2026-07-05",
        end: "2026-07-06",
        color: "teal",
        votes: {
          "user-1": "yes",
          "user-2": "yes",
          "user-3": "yes",
        },
      },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  it("renders modal content with slots ranked by votes", () => {
    renderWithProviders(
      <FinalizeEventModal open={true} onOpenChange={vi.fn()} event={mockEvent} />,
    );

    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("33%")).toBeInTheDocument();
  });

  it("calls finalizeEvent and closes modal when confirm is clicked", async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();
    mockFinalizeMutateAsync.mockResolvedValueOnce({});

    renderWithProviders(
      <FinalizeEventModal open={true} onOpenChange={handleOpenChange} event={mockEvent} />,
    );

    // Click confirm button (the primary button with check icon)
    const confirmButton = screen.getByRole("button", { name: /finalizeModal\.confirmButton/i });
    await user.click(confirmButton);

    expect(mockFinalizeMutateAsync).toHaveBeenCalledWith({
      eventId: "evt-123",
      slotKey: "2026-07-05_2026-07-06", // the slot with a 100% score
    });
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes modal on cancel click", async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();

    renderWithProviders(
      <FinalizeEventModal open={true} onOpenChange={handleOpenChange} event={mockEvent} />,
    );

    const cancelButton = screen.getByRole("button", { name: /actions\.cancel/i });
    await user.click(cancelButton);

    expect(handleOpenChange).toHaveBeenCalledWith(false);
    expect(mockFinalizeMutateAsync).not.toHaveBeenCalled();
  });

  it("allows selecting a different slot before confirming", async () => {
    const user = userEvent.setup();
    const handleOpenChange = vi.fn();
    mockFinalizeMutateAsync.mockResolvedValueOnce({});

    renderWithProviders(
      <FinalizeEventModal open={true} onOpenChange={handleOpenChange} event={mockEvent} />,
    );

    // The second slot in sorted order has text "33%"
    const lowerRankedSlotBtn = screen.getByText("33%").closest("button");
    expect(lowerRankedSlotBtn).not.toBeNull();
    if (lowerRankedSlotBtn) {
      await user.click(lowerRankedSlotBtn);
    }

    const confirmButton = screen.getByRole("button", { name: /finalizeModal\.confirmButton/i });
    await user.click(confirmButton);

    expect(mockFinalizeMutateAsync).toHaveBeenCalledWith({
      eventId: "evt-123",
      slotKey: "2026-07-01_2026-07-01",
    });
  });

  it("preselects the top slot of a new event instead of the pick made on the previous one (#106)", async () => {
    const user = userEvent.setup();
    mockFinalizeMutateAsync.mockResolvedValueOnce({});
    const otherEvent: SchedulerEvent = {
      ...mockEvent,
      id: "evt-456",
      proposedDates: mockEvent.proposedDates.map((slot) => ({
        ...slot,
        start: slot.start.replace("2026-07", "2026-09"),
        end: slot.end.replace("2026-07", "2026-09"),
      })),
    };

    const { rerender } = renderWithProviders(
      <FinalizeEventModal open={true} onOpenChange={vi.fn()} event={mockEvent} />,
    );
    const lowerRankedSlotBtn = screen.getByText("33%").closest("button");
    if (lowerRankedSlotBtn) await user.click(lowerRankedSlotBtn);

    rerender(<FinalizeEventModal open={true} onOpenChange={vi.fn()} event={otherEvent} />);
    await user.click(screen.getByRole("button", { name: /finalizeModal\.confirmButton/i }));

    expect(mockFinalizeMutateAsync).toHaveBeenCalledWith({ eventId: "evt-456", slotKey: "2026-09-05_2026-09-06" });
  });

  it("shows the full dates of a slot that spans two years", () => {
    const crossYearEvent: SchedulerEvent = {
      ...mockEvent,
      proposedDates: [{ start: "2026-12-30", end: "2027-01-02", color: "pink", votes: { "user-1": "maybe" } }],
    };

    renderWithProviders(
      <FinalizeEventModal open={true} onOpenChange={vi.fn()} event={crossYearEvent} />,
    );

    expect(screen.getByText(/2026.*2027/)).toBeInTheDocument();
  });

  it("renders pending state correctly when isPending is true", () => {
    mockIsPending = true;
    try {
      renderWithProviders(
        <FinalizeEventModal open={true} onOpenChange={vi.fn()} event={mockEvent} />,
      );

      const confirmButton = screen.getByRole("button", { name: /actions\.saving/i });
      expect(confirmButton).toBeDisabled();
      const cancelButton = screen.getByRole("button", { name: /actions\.cancel/i });
      expect(cancelButton).toBeDisabled();
    } finally {
      mockIsPending = false;
    }
  });

  it("renders with pl language and handles undefined votes and empty proposed dates", () => {
    const plI18n = createTestI18n();
    plI18n.changeLanguage("pl");

    const eventWithUndefinedVotes: SchedulerEvent = {
      ...mockEvent,
      proposedDates: [
        {
          start: "2026-07-01",
          end: "2026-07-01",
          color: "blue",
          votes: undefined,
        },
      ],
    };

    renderWithProviders(
      <FinalizeEventModal open={true} onOpenChange={vi.fn()} event={eventWithUndefinedVotes} />,
      { i18nInstance: plI18n },
    );

    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("handles event with empty proposedDates array", () => {
    const emptyDatesEvent: SchedulerEvent = {
      ...mockEvent,
      proposedDates: [],
    };

    renderWithProviders(
      <FinalizeEventModal open={true} onOpenChange={vi.fn()} event={emptyDatesEvent} />,
    );

    const confirmButton = screen.getByRole("button", { name: /finalizeModal\.confirmButton/i });
    expect(confirmButton).toBeInTheDocument();
  });
});

