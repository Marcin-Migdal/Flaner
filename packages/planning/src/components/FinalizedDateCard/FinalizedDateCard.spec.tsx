import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
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

  it("does not render reopen button for non-owner or when onReopen is undefined", () => {
    const { rerender } = renderWithProviders(<FinalizedDateCard event={baseEvent} isOwner={false} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(<FinalizedDateCard event={baseEvent} isOwner={true} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("handles same-day event, Polish locale, undefined finalizedSlotIndex, and missing votes", () => {
    const plI18n = createTestI18n();
    plI18n.changeLanguage("pl");

    const singleDayEvent: SchedulerEvent = {
      ...baseEvent,
      finalizedSlotIndex: undefined,
      proposedDates: [
        {
          start: "2026-07-10",
          end: "2026-07-10",
          color: "#10b981",
          votes: undefined,
        },
      ],
    };

    renderWithProviders(<FinalizedDateCard event={singleDayEvent} />, {
      i18nInstance: plI18n,
    });

    expect(screen.getByText("0/2")).toBeInTheDocument();
    expect(screen.getByText(/10 lipca 2026/i)).toBeInTheDocument();
  });
});
