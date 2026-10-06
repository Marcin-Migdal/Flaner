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
        color: "#3b82f6",
        votes: {
          "user-1": "yes",
          "user-2": "maybe",
        },
      },
      {
        start: "2026-07-05",
        end: "2026-07-06",
        color: "#10b981",
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
      finalizedSlotIndex: 1, // slot with 100% score is index 1
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
      finalizedSlotIndex: 0,
    });
  });

  it("handles cross-year date slots and tie-breaking by yesCount and originalIndex", () => {
    const crossYearEvent: SchedulerEvent = {
      ...mockEvent,
      proposedDates: [
        {
          start: "2026-12-30",
          end: "2027-01-02",
          color: "#ef4444",
          votes: { "user-1": "maybe" },
        },
        {
          start: "2026-08-01",
          end: "2026-08-02",
          color: "#10b981",
          votes: { "user-1": "yes" }, // score 1.0, yesCount 1
        },
        {
          start: "2026-08-03",
          end: "2026-08-04",
          color: "#06b6d4",
          votes: { "user-2": "yes" }, // score 1.0, yesCount 1 (triggers a.originalIndex - b.originalIndex)
        },
        {
          start: "2026-08-05",
          end: "2026-08-06",
          color: "#3b82f6",
          votes: { "user-1": "maybe", "user-2": "maybe" }, // score 1.0, yesCount 0
        },
        {
          start: "2026-09-01",
          end: "2026-09-02",
          color: "#8b5cf6",
          votes: {}, // score 0
        },
      ],
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
          color: "#3b82f6",
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

