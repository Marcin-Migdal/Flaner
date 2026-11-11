import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@flaner/test-utils";
import type { ProposedDateSlot } from "../../../../api/events/types";
import { rankSlots } from "../../../../utils/slotRanking";
import { AvailabilityGridHeader } from "./AvailabilityGridHeader";

describe("AvailabilityGridHeader", () => {
  const proposedDates: ProposedDateSlot[] = [
    {
      start: "2026-06-01T10:00:00Z",
      end: "2026-06-01T10:00:00Z",
      color: "blue",
      votes: { u1: "yes", u2: "yes", u3: "yes" },
    },
    {
      start: "2026-06-05T10:00:00Z",
      end: "2026-06-06T10:00:00Z",
      color: "teal",
      votes: { u1: "yes", u2: "maybe", u3: "no" },
    },
  ];

  const { slots: slotStats } = rankSlots({ proposedDates, participants: ["u1", "u2", "u3"] });

  it("renders participants count and slot stats", () => {
    renderWithProviders(
      <AvailabilityGridHeader
        proposedDates={proposedDates}
        participantsCount={3}
        slotStats={slotStats}
        gridTemplateColumns="150px 100px 100px"
      />,
    );

    expect(screen.getByText(/grid.participants/i)).toBeInTheDocument();
    expect(screen.getByText("01.06")).toBeInTheDocument();
    expect(screen.getByText("✓3")).toBeInTheDocument();
    expect(screen.getByText("(100%)")).toBeInTheDocument();
  });
});
