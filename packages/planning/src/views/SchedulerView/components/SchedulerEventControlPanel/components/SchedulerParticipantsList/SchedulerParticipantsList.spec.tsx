import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../../../../../api/events/types";
import { SchedulerParticipantsList } from "./SchedulerParticipantsList";

const mockEvent: SchedulerEvent = {
  id: "ev-1",
  name: "Summer Camp",
  description: "Camping trip",
  creatorId: "user-1",
  participants: ["user-1", "user-2"],
  proposedDates: [
    { start: "2026-07-01T10:00:00Z", end: "2026-07-03T18:00:00Z", color: "#3b82f6", votes: { "user-1": "yes" } },
  ],
  isFinalized: false,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

describe("SchedulerParticipantsList", () => {
  it("renders participant list with creator and unvoted status for non-voter", () => {
    renderWithProviders(
      <SchedulerParticipantsList
        participants={[
          { id: "user-1", name: "Alice", username: "Alice", usernameLower: "alice", type: "user" },
          { id: "user-2", name: "Bob", username: "Bob", usernameLower: "bob", type: "user" },
        ]}
        isParticipantsLoading={false}
        activeEvent={mockEvent}
      />,
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("hub.status.creator")).toBeInTheDocument();
    expect(screen.getByText(/hub.status.unvoted/)).toBeInTheDocument();
  });

  it("renders empty state when there are no participants", () => {
    renderWithProviders(
      <SchedulerParticipantsList
        participants={[]}
        isParticipantsLoading={false}
        activeEvent={mockEvent}
      />,
    );

    expect(screen.getByText("hub.noParticipants")).toBeInTheDocument();
  });
});
