import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { createMockUser, renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../api/events/types";
import type { ParticipantResult } from "../../api/participants";
import { SchedulerView } from "./SchedulerView";

const signedInUser = createMockUser({ uid: "user-1", username: "Alice", email: "alice@flaner.app" });

const mockEvents: SchedulerEvent[] = [
  {
    id: "evt-1",
    name: "Sprint 42 Planning",
    description: "Bi-weekly sprint planning",
    creatorId: "user-1",
    participants: ["user-1", "user-2"],
    proposedDates: [
      {
        start: "2026-08-01",
        end: "2026-08-01",
        color: "blue",
        votes: {
          "user-1": "yes",
        },
      },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: "evt-2",
    name: "Quarterly Retro",
    description: "Retro of Q2",
    creatorId: "user-1",
    participants: ["user-1"],
    proposedDates: [
      {
        start: "2026-08-15",
        end: "2026-08-15",
        color: "teal",
        votes: {},
      },
    ],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  },
];

const mockProfiles: ParticipantResult[] = [
  { id: "user-1", name: "Alice", avatarUrl: "", type: "user", username: "alice", usernameLower: "alice" },
  { id: "user-2", name: "Bob", avatarUrl: "", type: "user", username: "bob", usernameLower: "bob" },
];

let queryEventsData: SchedulerEvent[] | undefined = mockEvents;

vi.mock("../../hooks/api/query/useGetUserSchedulerEventsRealtimeQuery", () => ({
  useGetUserSchedulerEventsRealtimeQuery: () => ({
    data: queryEventsData,
    isLoading: false,
  }),
}));

vi.mock("../../hooks/api/query/useGetEventParticipantsProfilesQuery", () => ({
  useGetEventParticipantsProfilesQuery: () => ({
    data: mockProfiles,
    isLoading: false,
  }),
}));

vi.mock("../../hooks/api/mutation", () => ({
  useDeleteEventMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUnfinalizeEventMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useBatchVoteUnvotedSlotsMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useVoteSlotMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateEventMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateEventMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe("SchedulerView", () => {
  it("renders empty state when there are no events", () => {
    queryEventsData = [];

    renderWithProviders(<SchedulerView />, { user: signedInUser });

    expect(screen.getAllByText("hub.noEvents")[0]).toBeInTheDocument();
  });

  it("renders first event by default when events exist without hash", () => {
    queryEventsData = mockEvents;

    renderWithProviders(<SchedulerView />, { user: signedInUser });

    expect(screen.getByText("Sprint 42 Planning")).toBeInTheDocument();
  });

  it("selects event from location hash when specified", () => {
    queryEventsData = mockEvents;

    renderWithProviders(<SchedulerView />, {
      user: signedInUser,
      initialEntries: ["/#evt-2"],
    });

    expect(screen.getByText("Quarterly Retro")).toBeInTheDocument();
  });
});
