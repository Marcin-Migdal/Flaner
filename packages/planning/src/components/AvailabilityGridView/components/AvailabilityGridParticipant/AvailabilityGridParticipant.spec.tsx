import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { ProposedDateSlot } from "../../../../api/events/types";
import { AvailabilityGridParticipant } from "./AvailabilityGridParticipant";

describe("AvailabilityGridParticipant", () => {
  const proposedDates: ProposedDateSlot[] = [
    {
      start: "2026-06-01T10:00:00Z",
      end: "2026-06-01T12:00:00Z",
      color: "#3b82f6",
      votes: { "user-1": "yes", "user-2": "no" },
    },
  ];

  it("renders interactive vote buttons for current user and triggers onVoteClick", async () => {
    const user = userEvent.setup();
    const onVoteClick = vi.fn();

    renderWithProviders(
      <AvailabilityGridParticipant
        uid="user-1"
        profile={{ id: "user-1", name: "Alice", username: "Alice", usernameLower: "alice", type: "user" }}
        isCurrentUser={true}
        isCreator={true}
        proposedDates={proposedDates}
        gridTemplateColumns="150px 100px"
        onVoteClick={onVoteClick}
      />,
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("grid.you")).toBeInTheDocument();

    const noButton = screen.getByTitle("voting.no");
    await user.click(noButton);

    expect(onVoteClick).toHaveBeenCalledWith(0, "no", "yes");
  });

  it("renders static vote badge for other users without interactive buttons", () => {
    renderWithProviders(
      <AvailabilityGridParticipant
        uid="user-2"
        profile={{ id: "user-2", name: "Bob", username: "Bob", usernameLower: "bob", type: "user" }}
        isCurrentUser={false}
        isCreator={false}
        proposedDates={proposedDates}
        gridTemplateColumns="150px 100px"
        onVoteClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByTitle("voting.yes")).not.toBeInTheDocument();
    expect(screen.getByTitle("voting.no")).toBeInTheDocument();
  });
});
