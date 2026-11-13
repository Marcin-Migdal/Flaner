import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useVoteSlotMutation } from "./useVoteSlotMutation";
import * as eventsApi from "../../../../api/events";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/events", () => ({
  voteSchedulerEventSlot: vi.fn(),
}));

describe("useVoteSlotMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls voteSchedulerEventSlot on mutate", async () => {
    vi.mocked(eventsApi.voteSchedulerEventSlot).mockResolvedValueOnce(undefined);
    const { result } = renderHookWithProviders(() => useVoteSlotMutation(), { user: mockUser });

    act(() => {
      result.current.mutate({
        eventId: "evt-1",
        slotKey: "2026-06-01_2026-06-01",
        userId: "user-123",
        vote: "yes",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.voteSchedulerEventSlot).toHaveBeenCalledWith("evt-1", "2026-06-01_2026-06-01", "user-123", "yes");
  });

  it("calls custom onSuccess when provided in options", async () => {
    vi.mocked(eventsApi.voteSchedulerEventSlot).mockResolvedValueOnce(undefined);
    const onSuccess = vi.fn();
    const { result } = renderHookWithProviders(() => useVoteSlotMutation({ onSuccess }), { user: mockUser });

    act(() => {
      result.current.mutate({
        eventId: "evt-1",
        slotKey: "2026-06-01_2026-06-01",
        userId: "user-123",
        vote: "yes",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccess).toHaveBeenCalled();
  });

  it("throws error when user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useVoteSlotMutation(), { user: null });

    act(() => {
      result.current.mutate({
        eventId: "evt-1",
        slotKey: "2026-06-01_2026-06-01",
        userId: "user-123",
        vote: "yes",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});
