import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@flaner/test-utils";
import type { ProposedDateSlot } from "../../../../api/events/types";
import type { SlotStat } from "../../types";
import { AvailabilityGridFooter } from "./AvailabilityGridFooter";

describe("AvailabilityGridFooter", () => {
  const proposedDates: ProposedDateSlot[] = [
    { start: "2026-06-01T10:00:00Z", end: "2026-06-01T10:00:00Z", color: "#3b82f6" },
  ];

  const slotStats: SlotStat[] = [
    { score: 3, yesCount: 3, maybeCount: 0, noCount: 0, matchPercentage: 100 },
  ];

  it("renders match rate and slot stats", () => {
    renderWithProviders(
      <AvailabilityGridFooter
        proposedDates={proposedDates}
        slotStats={slotStats}
        maxScore={3}
        participantsCount={3}
        gridTemplateColumns="150px 100px"
      />,
    );

    expect(screen.getByText("grid.matchRate")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText(/3\/3/)).toBeInTheDocument();
  });
});
