import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@flaner/test-utils";
import type { ProposedDateSlot } from "../../../../api/events/types";
import { rankSlots } from "../../../../utils/slotRanking";
import { AvailabilityGridFooter } from "./AvailabilityGridFooter";

describe("AvailabilityGridFooter", () => {
  const proposedDates: ProposedDateSlot[] = [
    {
      start: "2026-06-01T10:00:00Z",
      end: "2026-06-01T10:00:00Z",
      color: "blue",
      votes: { u1: "yes", u2: "yes", u3: "yes" },
    },
  ];

  const { slots: slotStats } = rankSlots({ proposedDates, participants: ["u1", "u2", "u3"] });

  it("renders match rate and slot stats", () => {
    renderWithProviders(
      <AvailabilityGridFooter
        proposedDates={proposedDates}
        slotStats={slotStats}
        participantsCount={3}
        gridTemplateColumns="150px 100px"
      />,
    );

    expect(screen.getByText("grid.matchRate")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText(/3\/3/)).toBeInTheDocument();
  });
});
