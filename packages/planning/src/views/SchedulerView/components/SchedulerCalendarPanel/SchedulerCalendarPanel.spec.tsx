import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../../../api/events/types";
import type { ParticipantResult } from "../../../../api/participants";
import { SchedulerCalendarPanel } from "./SchedulerCalendarPanel";

const mockUser = { uid: "u1", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockVoteSlot = vi.fn();
vi.mock("../../../../hooks/api/mutation", () => ({
  useVoteSlotMutation: () => ({
    mutateAsync: mockVoteSlot,
    isPending: false,
  }),
}));

describe("SchedulerCalendarPanel", () => {
  const mockEvent: SchedulerEvent = {
    id: "evt-cal",
    name: "Sprint Demo",
    description: "Review sprint deliverables",
    creatorId: "u1",
    participants: ["u1", "u2"],
    proposedDates: [
      {
        start: "2026-08-10",
        end: "2026-08-11",
        color: "#3b82f6",
        votes: {
          u1: "yes",
          u2: "maybe",
        },
      },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  const mockParticipants: ParticipantResult[] = [
    { id: "u1", name: "Alice", avatarUrl: "", type: "user", username: "alice", usernameLower: "alice" },
    { id: "u2", name: "Bob", avatarUrl: "", type: "user", username: "bob", usernameLower: "bob" },
  ];

  it("renders empty state when activeEvent is null", () => {
    renderWithProviders(
      <SchedulerCalendarPanel activeEvent={null} participants={[]} />,
    );

    expect(screen.getByText("hub.noEvents")).toBeInTheDocument();
  });

  it("renders calendar and ranked sheet trigger button when activeEvent is present", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SchedulerCalendarPanel activeEvent={mockEvent} participants={mockParticipants} />,
    );

    // Look for ranked slots action button
    const rankedSheetTrigger = screen.getByRole("button", { name: /ranking\.title/i });
    expect(rankedSheetTrigger).toBeInTheDocument();

    await user.click(rankedSheetTrigger);
    expect(screen.getByText("rankedSheet.eyebrow")).toBeInTheDocument();
  });
});
