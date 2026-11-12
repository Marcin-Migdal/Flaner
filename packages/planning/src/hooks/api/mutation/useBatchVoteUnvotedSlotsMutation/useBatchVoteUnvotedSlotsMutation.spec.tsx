import { describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useBatchVoteUnvotedSlotsMutation } from "./useBatchVoteUnvotedSlotsMutation";
import * as eventsApi from "../../../../api/events";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/events", () => ({
  batchVoteUnvotedSlots: vi.fn(),
}));

describe("useBatchVoteUnvotedSlotsMutation", () => {
  it("calls batchVoteUnvotedSlots on mutate and triggers onSuccess", async () => {
    vi.mocked(eventsApi.batchVoteUnvotedSlots).mockResolvedValueOnce(undefined);

    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useBatchVoteUnvotedSlotsMutation({ onSuccess: onSuccessMock }), { user: mockUser });

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
    const { result } = renderHookWithProviders(() => useBatchVoteUnvotedSlotsMutation(), { user: null });

    act(() => {
      result.current.mutate({
        eventId: "evt-1",
        userId: "user-123",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("executes successfully without options and with default fallbackVote", async () => {
    vi.mocked(eventsApi.batchVoteUnvotedSlots).mockResolvedValueOnce(undefined);
    const { result } = renderHookWithProviders(() => useBatchVoteUnvotedSlotsMutation(), { user: mockUser });

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
