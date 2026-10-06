import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@flaner/test-utils";
import type { ProposedDateSlot } from "../../../../api/events/types";
import { AvailabilityGridWinnerHeader } from "./AvailabilityGridWinnerHeader";

describe("AvailabilityGridWinnerHeader", () => {
  const proposedDates: ProposedDateSlot[] = [
    { start: "2026-06-01T10:00:00Z", end: "2026-06-01T12:00:00Z", color: "#3b82f6" },
    { start: "2026-06-02T10:00:00Z", end: "2026-06-02T12:00:00Z", color: "#10b981" },
  ];

  it("renders status column and winner badge on the winning slot", () => {
    renderWithProviders(
      <AvailabilityGridWinnerHeader
        proposedDates={proposedDates}
        finalizedSlotIndex={0}
        gridTemplateColumns="150px 100px 100px"
      />,
    );

    expect(screen.getByText("grid.status")).toBeInTheDocument();
    expect(screen.getByText("grid.winner")).toBeInTheDocument();
  });

  it("does not render winner badge when finalizedSlotIndex is undefined", () => {
    renderWithProviders(
      <AvailabilityGridWinnerHeader
        proposedDates={proposedDates}
        gridTemplateColumns="150px 100px 100px"
      />,
    );

    expect(screen.getByText("grid.status")).toBeInTheDocument();
    expect(screen.queryByText("grid.winner")).not.toBeInTheDocument();
  });
});
