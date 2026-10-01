import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../api/events/types";
import { FinalizeEventModal } from "./FinalizeEventModal";

const mockFinalizeMutateAsync = vi.fn();

vi.mock("../../hooks/api/mutation/useFinalizeEventMutation", () => ({
  useFinalizeEventMutation: () => ({
    mutateAsync: mockFinalizeMutateAsync,
    isPending: false,
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
});
