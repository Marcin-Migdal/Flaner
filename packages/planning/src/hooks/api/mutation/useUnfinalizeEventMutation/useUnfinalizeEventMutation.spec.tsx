import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../../../api/events/types";
import { useUnfinalizeEventMutation } from "./useUnfinalizeEventMutation";
import * as eventsApi from "../../../../api/events";

const mockUser = createMockUser({
  uid: "user-123",
  username: "Alice",
  email: "alice@flaner.app",
});

vi.mock("../../../../api/events", () => ({
  unfinalizeSchedulerEvent: vi.fn(),
}));

describe("useUnfinalizeEventMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleEvent: SchedulerEvent = {
    id: "evt-1",
    name: "Event",
    description: "Desc",
    creatorId: "user-123",
    participants: ["user-123"],
    proposedDates: [],
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  it("calls unfinalizeSchedulerEvent on mutate", async () => {
    vi.mocked(eventsApi.unfinalizeSchedulerEvent).mockResolvedValueOnce(undefined);
    const { result } = renderHookWithProviders(() => useUnfinalizeEventMutation(), { user: mockUser });

    act(() => {
      result.current.mutate({ event: sampleEvent });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.unfinalizeSchedulerEvent).toHaveBeenCalledWith(sampleEvent, mockUser);
  });

  it("calls custom onSuccess when provided in options", async () => {
    vi.mocked(eventsApi.unfinalizeSchedulerEvent).mockResolvedValueOnce(undefined);
    const onSuccess = vi.fn();
    const { result } = renderHookWithProviders(() => useUnfinalizeEventMutation({ onSuccess }), { user: mockUser });

    act(() => {
      result.current.mutate({ event: sampleEvent });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccess).toHaveBeenCalled();
  });

  it("throws error when user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useUnfinalizeEventMutation(), { user: null });

    act(() => {
      result.current.mutate({ event: sampleEvent });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});
