import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../api/events/types";
import { FinalizedDateCard } from "./FinalizedDateCard";

describe("FinalizedDateCard", () => {
  const baseEvent: SchedulerEvent = {
    id: "evt-1",
    name: "Summer Trip",
    description: "Vacation planning",
    creatorId: "user-1",
    participants: ["user-1", "user-2"],
    proposedDates: [
      {
        start: "2026-07-10",
        end: "2026-07-15",
        color: "#10b981",
        votes: {
          "user-1": "yes",
          "user-2": "yes",
        },
      },
    ],
    isFinalized: true,
    finalizedSlotIndex: 0,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  it("renders finalized status and vote counts", () => {
    renderWithProviders(<FinalizedDateCard event={baseEvent} />);

    expect(screen.getByText("2/2")).toBeInTheDocument();
  });

  it("returns null if winningSlot does not exist", () => {
    const eventWithoutSlots: SchedulerEvent = {
      ...baseEvent,
      proposedDates: [],
    };

    const { container } = renderWithProviders(<FinalizedDateCard event={eventWithoutSlots} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders reopen button for owner and handles click", async () => {
    const user = userEvent.setup();
    const handleReopen = vi.fn();

    renderWithProviders(
      <FinalizedDateCard event={baseEvent} isOwner={true} onReopen={handleReopen} />,
    );

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(handleReopen).toHaveBeenCalledTimes(1);
  });

  it("does not render reopen button for non-owner", () => {
    renderWithProviders(<FinalizedDateCard event={baseEvent} isOwner={false} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
