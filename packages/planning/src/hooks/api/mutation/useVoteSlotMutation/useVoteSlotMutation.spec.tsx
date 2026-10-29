import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useVoteSlotMutation } from "./useVoteSlotMutation";
import * as eventsApi from "../../../../api/events";

let mockUser: { uid: string } | null = { uid: "user-123" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/events", () => ({
  voteSchedulerEventSlot: vi.fn(),
}));

describe("useVoteSlotMutation", () => {
  beforeEach(() => {
    mockUser = { uid: "user-123" };
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("calls voteSchedulerEventSlot on mutate", async () => {
    vi.mocked(eventsApi.voteSchedulerEventSlot).mockResolvedValueOnce(undefined);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useVoteSlotMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        eventId: "evt-1",
        slotIndex: 0,
        userId: "user-123",
        vote: "yes",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.voteSchedulerEventSlot).toHaveBeenCalledWith("evt-1", 0, "user-123", "yes");
  });

  it("calls custom onSuccess when provided in options", async () => {
    vi.mocked(eventsApi.voteSchedulerEventSlot).mockResolvedValueOnce(undefined);
    const onSuccess = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useVoteSlotMutation({ onSuccess }), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        eventId: "evt-1",
        slotIndex: 0,
        userId: "user-123",
        vote: "yes",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccess).toHaveBeenCalled();
  });

  it("throws error when user is not authenticated", async () => {
    mockUser = null;

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useVoteSlotMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        eventId: "evt-1",
        slotIndex: 0,
        userId: "user-123",
        vote: "yes",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.userNotAuthenticated");
  });
});
