import { describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../../../api/events/types";
import { useCreateEventMutation } from "./useCreateEventMutation";
import * as eventsApi from "../../../../api/events";

const mockUser = createMockUser({
  uid: "user-123",
  username: "Alice",
  email: "alice@flaner.app",
});

vi.mock("../../../../api/events", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../api/events")>()),
  createSchedulerEvent: vi.fn(),
}));

describe("useCreateEventMutation", () => {
  it("calls createSchedulerEvent on mutate with autoVote and triggers onSuccess", async () => {
    const mockCreated: SchedulerEvent = {
      id: "evt-1",
      name: "New Event",
      description: "Desc",
      creatorId: "user-123",
      participants: ["user-123"],
      proposedDates: [{ start: "100", end: "200", color: "blue", votes: { "user-123": "yes" } }],
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    vi.mocked(eventsApi.createSchedulerEvent).mockResolvedValueOnce(mockCreated);

    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useCreateEventMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    act(() => {
      result.current.mutate({
        name: "New Event",
        description: "Desc",
        participants: ["user-123"],
        proposedDates: [
          { start: "100", end: "200", color: "blue" },
          { start: "200", end: "300", color: "blue" },
        ],
        autoVoteProposedDates: true,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.createSchedulerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        votes: { "user-123": { "100_200": "yes", "200_300": "yes" } },
      }),
      mockUser,
    );
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error when user is unauthenticated", async () => {
    const { result } = renderHookWithProviders(() => useCreateEventMutation(), { user: null });

    act(() => {
      result.current.mutate({
        name: "New Event",
        description: "Desc",
        participants: ["user-123"],
        proposedDates: [],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("executes successfully without autoVote and without options", async () => {
    vi.mocked(eventsApi.createSchedulerEvent).mockResolvedValueOnce({ id: "evt-2" } as unknown as SchedulerEvent);
    const { result } = renderHookWithProviders(() => useCreateEventMutation(), { user: mockUser });

    act(() => {
      result.current.mutate({
        name: "Manual Vote Event",
        description: "Desc",
        participants: ["user-123"],
        proposedDates: [{ start: "100", end: "200", color: "blue" }],
        autoVoteProposedDates: false,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.createSchedulerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        proposedDates: [{ start: "100", end: "200", color: "blue" }],
      }),
      mockUser,
    );
  });
});
