import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useBatchVoteUnvotedSlotsMutation } from "./useBatchVoteUnvotedSlotsMutation";
import * as eventsApi from "../../../../api/events";

let mockUser: { uid: string } | null = { uid: "user-123" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/events", () => ({
  batchVoteUnvotedSlots: vi.fn(),
}));

describe("useBatchVoteUnvotedSlotsMutation", () => {
  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("calls batchVoteUnvotedSlots on mutate and triggers onSuccess", async () => {
    vi.mocked(eventsApi.batchVoteUnvotedSlots).mockResolvedValueOnce(undefined);

    const onSuccessMock = vi.fn();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBatchVoteUnvotedSlotsMutation({ onSuccess: onSuccessMock }), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        eventId: "evt-1",
        userId: "user-123",
        fallbackVote: "no",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.batchVoteUnvotedSlots).toHaveBeenCalledWith("evt-1", "user-123", "no");
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error when user is unauthenticated", async () => {
    mockUser = null;
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBatchVoteUnvotedSlotsMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        eventId: "evt-1",
        userId: "user-123",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.userNotAuthenticated");
    mockUser = { uid: "user-123" };
  });

  it("executes successfully without options and with default fallbackVote", async () => {
    vi.mocked(eventsApi.batchVoteUnvotedSlots).mockResolvedValueOnce(undefined);
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useBatchVoteUnvotedSlotsMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        eventId: "evt-1",
        userId: "user-123",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.batchVoteUnvotedSlots).toHaveBeenCalledWith("evt-1", "user-123", "no");
  });
});
