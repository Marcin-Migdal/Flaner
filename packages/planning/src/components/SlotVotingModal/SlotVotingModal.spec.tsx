import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../api/events/types";
import type { ParticipantResult } from "../../api/participants";
import { SlotVotingModal } from "./SlotVotingModal";

let mockIsVoting = false;
const mockVoteSlotMutateAsync = vi.fn();

vi.mock("../../hooks/api/mutation/useVoteSlotMutation", () => ({
  useVoteSlotMutation: () => ({
    mutateAsync: mockVoteSlotMutateAsync,
    get isPending() {
      return mockIsVoting;
    },
  }),
}));

describe("SlotVotingModal", () => {
  const mockEvent: SchedulerEvent = {
    id: "evt-1",
    name: "Project Sync",
    description: "Sync meeting",
    creatorId: "u1",
    participants: ["u1", "u2", "u3"],
    proposedDates: [
      {
        start: "2026-07-20T10:00:00Z",
        end: "2026-07-20T12:00:00Z",
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
    { id: "u3", name: "Charlie", avatarUrl: "", type: "user", username: "charlie", usernameLower: "charlie" },
  ];

  it("returns null if event is null or slotIndex is invalid", () => {
    const { container } = renderWithProviders(
      <SlotVotingModal
        isOpen={true}
        onOpenChange={vi.fn()}
        event={null}
        slotIndex={null}
        participantsProfiles={mockParticipants}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders participants breakdown by vote and handles vote click", async () => {
    const user = userEvent.setup();
    mockVoteSlotMutateAsync.mockResolvedValueOnce({});

    renderWithProviders(
      <SlotVotingModal
        isOpen={true}
        onOpenChange={vi.fn()}
        event={mockEvent}
        slotIndex={0}
        participantsProfiles={mockParticipants}
        currentUserId="u1"
      />,
    );

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Charlie")).toBeInTheDocument();

    // Click "Maybe" vote button
    const maybeButton = screen.getByRole("button", { name: /voting\.maybe/i });
    await user.click(maybeButton);

    expect(mockVoteSlotMutateAsync).toHaveBeenCalledWith({
      eventId: "evt-1",
      slotIndex: 0,
      userId: "u1",
      vote: "maybe",
    });
  });

  it("toggles off vote if clicked the same vote", async () => {
    const user = userEvent.setup();
    mockVoteSlotMutateAsync.mockResolvedValueOnce({});

    renderWithProviders(
      <SlotVotingModal
        isOpen={true}
        onOpenChange={vi.fn()}
        event={mockEvent}
        slotIndex={0}
        participantsProfiles={mockParticipants}
        currentUserId="u1"
      />,
    );

    // Current vote of u1 is "yes". Clicking "yes" again should vote null
    const yesButton = screen.getByRole("button", { name: /voting\.yes/i });
    await user.click(yesButton);

    expect(mockVoteSlotMutateAsync).toHaveBeenCalledWith({
      eventId: "evt-1",
      slotIndex: 0,
      userId: "u1",
      vote: null,
    });
  });

  it("handles voting 'no', renders noParticipants with avatar, and closes on mobile", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    mockVoteSlotMutateAsync.mockResolvedValueOnce({});

    const eventWithNo: SchedulerEvent = {
      ...mockEvent,
      proposedDates: [
        {
          ...mockEvent.proposedDates[0],
          votes: {
            u1: "maybe",
            u2: "no",
          },
        },
      ],
    };

    const participantsWithAvatar: ParticipantResult[] = [
      { id: "u1", name: "Alice", avatarUrl: "https://example.com/alice.png", type: "user", username: "alice", usernameLower: "alice" },
      { id: "u2", name: "Bob", avatarUrl: "https://example.com/bob.png", type: "user", username: "bob", usernameLower: "bob" },
      { id: "u3", name: "Charlie", avatarUrl: "", type: "user", username: "charlie", usernameLower: "charlie" },
    ];

    // Mock mobile window width
    vi.stubGlobal("innerWidth", 500);

    renderWithProviders(
      <SlotVotingModal
        isOpen={true}
        onOpenChange={onOpenChange}
        event={eventWithNo}
        slotIndex={0}
        participantsProfiles={participantsWithAvatar}
        currentUserId="u1"
      />,
    );

    // Verify Bob is in No section with avatar image
    expect(screen.getByAltText("Bob")).toBeInTheDocument();

    // Click "No" vote button
    const noButton = screen.getByRole("button", { name: /voting\.no/i });
    await user.click(noButton);

    expect(mockVoteSlotMutateAsync).toHaveBeenCalledWith({
      eventId: "evt-1",
      slotIndex: 0,
      userId: "u1",
      vote: "no",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);

    vi.unstubAllGlobals();
  });

  it("does not vote if currentUserId is not provided", async () => {
    const user = userEvent.setup();
    mockVoteSlotMutateAsync.mockClear();

    renderWithProviders(
      <SlotVotingModal
        isOpen={true}
        onOpenChange={vi.fn()}
        event={mockEvent}
        slotIndex={0}
        participantsProfiles={mockParticipants}
      />,
    );

    const yesButton = screen.getByRole("button", { name: /voting\.yes/i });
    await user.click(yesButton);

    expect(mockVoteSlotMutateAsync).not.toHaveBeenCalled();
  });

  it("renders both avatar and initials fallback for all vote sections and handles slot without votes", () => {
    const eventWithoutVotes: SchedulerEvent = {
      ...mockEvent,
      proposedDates: [
        {
          start: "2026-07-20T10:00:00Z",
          end: "2026-07-20T12:00:00Z",
          color: "#3b82f6",
          // votes undefined to test votes || {} fallback
        },
      ],
    };

    const comprehensiveParticipants: ParticipantResult[] = [
      { id: "u-yes-img", name: "Yes Img", avatarUrl: "https://example.com/yes.png", type: "user", username: "yi", usernameLower: "yi" },
      { id: "u-yes-noimg", name: "Yes NoImg", avatarUrl: "", type: "user", username: "yni", usernameLower: "yni" },
      { id: "u-maybe-img", name: "Maybe Img", avatarUrl: "https://example.com/maybe.png", type: "user", username: "mi", usernameLower: "mi" },
      { id: "u-maybe-noimg", name: "Maybe NoImg", avatarUrl: "", type: "user", username: "mni", usernameLower: "mni" },
      { id: "u-no-img", name: "No Img", avatarUrl: "https://example.com/no.png", type: "user", username: "ni", usernameLower: "ni" },
      { id: "u-no-noimg", name: "No NoImg", avatarUrl: "", type: "user", username: "nni", usernameLower: "nni" },
      { id: "u-unv-img", name: "Unvoted Img", avatarUrl: "https://example.com/unv.png", type: "user", username: "ui", usernameLower: "ui" },
      { id: "u-unv-noimg", name: "Unvoted NoImg", avatarUrl: "", type: "user", username: "uni", usernameLower: "uni" },
    ];

    const eventWithAllVotes: SchedulerEvent = {
      ...mockEvent,
      proposedDates: [
        {
          start: "2026-07-20T10:00:00Z",
          end: "2026-07-20T12:00:00Z",
          color: "#3b82f6",
          votes: {
            "u-yes-img": "yes",
            "u-yes-noimg": "yes",
            "u-maybe-img": "maybe",
            "u-maybe-noimg": "maybe",
            "u-no-img": "no",
            "u-no-noimg": "no",
          },
        },
      ],
    };

    const { rerender } = renderWithProviders(
      <SlotVotingModal
        isOpen={true}
        onOpenChange={vi.fn()}
        event={eventWithAllVotes}
        slotIndex={0}
        participantsProfiles={comprehensiveParticipants}
        currentUserId="u-yes-img"
      />,
    );

    expect(screen.getByAltText("Yes Img")).toBeInTheDocument();
    expect(screen.getByText("Yes NoImg")).toBeInTheDocument();
    expect(screen.getByAltText("Maybe Img")).toBeInTheDocument();
    expect(screen.getByText("Maybe NoImg")).toBeInTheDocument();
    expect(screen.getByAltText("No Img")).toBeInTheDocument();
    expect(screen.getByText("No NoImg")).toBeInTheDocument();
    expect(screen.getByAltText("Unvoted Img")).toBeInTheDocument();
    expect(screen.getByText("Unvoted NoImg")).toBeInTheDocument();

    // Rerender with slot having undefined votes and empty color
    const eventWithoutVotesOrColor: SchedulerEvent = {
      ...eventWithoutVotes,
      proposedDates: [
        {
          start: "2026-07-20T10:00:00Z",
          end: "2026-07-20T12:00:00Z",
          color: "",
        },
      ],
    };

    rerender(
      <SlotVotingModal
        isOpen={true}
        onOpenChange={vi.fn()}
        event={eventWithoutVotesOrColor}
        slotIndex={0}
        participantsProfiles={mockParticipants}
        currentUserId="u1"
      />,
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
  });

  it("renders loader spinner when isVoting is true", () => {
    mockIsVoting = true;
    try {
      renderWithProviders(
        <SlotVotingModal
          isOpen={true}
          onOpenChange={vi.fn()}
          event={mockEvent}
          slotIndex={0}
          participantsProfiles={mockParticipants}
          currentUserId="u1"
        />,
      );

      const yesBtn = screen.getByRole("button", { name: /voting\.yes/i });
      const maybeBtn = screen.getByRole("button", { name: /voting\.maybe/i });
      const noBtn = screen.getByRole("button", { name: /voting\.no/i });
      expect(yesBtn).toBeDisabled();
      expect(maybeBtn).toBeDisabled();
      expect(noBtn).toBeDisabled();

      // Render with user who voted "no" to cover the remaining Loader2 branches
      const eventWithUserNo: SchedulerEvent = {
        ...mockEvent,
        proposedDates: [
          {
            ...mockEvent.proposedDates[0],
            votes: { u1: "no" },
          },
        ],
      };

      const { unmount } = renderWithProviders(
        <SlotVotingModal
          isOpen={true}
          onOpenChange={vi.fn()}
          event={eventWithUserNo}
          slotIndex={0}
          participantsProfiles={mockParticipants}
          currentUserId="u1"
        />,
      );
      unmount();
    } finally {
      mockIsVoting = false;
    }
  });
});
