import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../../../api/events/types";
import { useCreateEventMutation } from "./useCreateEventMutation";
import * as eventsApi from "../../../../api/events";

let mockUser: {
  uid: string;
  username: string;
  email: string;
} | null = {
  uid: "user-123",
  username: "Alice",
  email: "alice@flaner.app",
};

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/events", () => ({
  createSchedulerEvent: vi.fn(),
}));

describe("useCreateEventMutation", () => {
  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("calls createSchedulerEvent on mutate with autoVote and triggers onSuccess", async () => {
    const mockCreated: SchedulerEvent = {
      id: "evt-1",
      name: "New Event",
      description: "Desc",
      creatorId: "user-123",
      participants: ["user-123"],
      proposedDates: [{ id: "slot-1", start: "100", end: "200", color: "#3b82f6", votes: { "user-123": "yes" } }],
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    };
    vi.mocked(eventsApi.createSchedulerEvent).mockResolvedValueOnce(mockCreated);

    const onSuccessMock = vi.fn();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateEventMutation({ onSuccess: onSuccessMock }), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        name: "New Event",
        description: "Desc",
        participants: ["user-123"],
        proposedDates: [
          { id: "slot-1", start: "100", end: "200", color: "#3b82f6", votes: { "other-user": "yes" } },
          { id: "slot-2", start: "200", end: "300", color: "#3b82f6" },
        ],
        autoVoteProposedDates: true,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.createSchedulerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        proposedDates: expect.arrayContaining([
          expect.objectContaining({
            votes: { "user-123": "yes" },
          }),
        ]),
      }),
      mockUser,
    );
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error when user is unauthenticated", async () => {
    mockUser = null;
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateEventMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        name: "New Event",
        description: "Desc",
        participants: ["user-123"],
        proposedDates: [],
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.userNotAuthenticated");
    mockUser = { uid: "user-123", username: "Alice", email: "alice@flaner.app" };
  });

  it("executes successfully without autoVote and without options", async () => {
    vi.mocked(eventsApi.createSchedulerEvent).mockResolvedValueOnce({ id: "evt-2" } as unknown as SchedulerEvent);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCreateEventMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        name: "Manual Vote Event",
        description: "Desc",
        participants: ["user-123"],
        proposedDates: [{ id: "slot-1", start: "100", end: "200", color: "#3b82f6" }],
        autoVoteProposedDates: false,
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.createSchedulerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        proposedDates: [{ id: "slot-1", start: "100", end: "200", color: "#3b82f6" }],
      }),
      mockUser,
    );
  });
});
