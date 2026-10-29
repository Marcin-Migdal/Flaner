import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@flaner/test-utils";
import type { ProposedDateSlot } from "../../../../api/events/types";
import type { SlotStat } from "../../types";
import { AvailabilityGridHeader } from "./AvailabilityGridHeader";

describe("AvailabilityGridHeader", () => {
  const proposedDates: ProposedDateSlot[] = [
    { start: "2026-06-01T10:00:00Z", end: "2026-06-01T10:00:00Z", color: "#3b82f6" },
    { start: "2026-06-05T10:00:00Z", end: "2026-06-06T10:00:00Z", color: "#10b981" },
  ];

  const slotStats: SlotStat[] = [
    { score: 3, yesCount: 3, maybeCount: 0, noCount: 0, matchPercentage: 100 },
    { score: 1, yesCount: 1, maybeCount: 1, noCount: 1, matchPercentage: 33 },
  ];

  it("renders participants count and slot stats", () => {
    renderWithProviders(
      <AvailabilityGridHeader
        proposedDates={proposedDates}
        participantsCount={3}
        slotStats={slotStats}
        maxScore={3}
        gridTemplateColumns="150px 100px 100px"
      />,
    );

    expect(screen.getByText(/grid.participants/i)).toBeInTheDocument();
    expect(screen.getByText("01.06")).toBeInTheDocument();
    expect(screen.getByText("✓3")).toBeInTheDocument();
    expect(screen.getByText("(100%)")).toBeInTheDocument();
  });
});
