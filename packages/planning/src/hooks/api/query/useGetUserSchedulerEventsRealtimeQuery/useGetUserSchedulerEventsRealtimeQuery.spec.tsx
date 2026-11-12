import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../../../api/events/types";
import { useGetUserSchedulerEventsRealtimeQuery } from "./useGetUserSchedulerEventsRealtimeQuery";
import { eventKeys } from "../../queryKeys";
import * as eventsApi from "../../../../api/events";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/events", () => ({
  getUserSchedulerEvents: vi.fn(),
  subscribeToUserSchedulerEvents: vi.fn(() => vi.fn()),
}));

describe("useGetUserSchedulerEventsRealtimeQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const sampleEvents: SchedulerEvent[] = [
    {
      id: "evt-1",
      name: "Meeting",
      description: "Dev sync",
      creatorId: "user-123",
      participants: ["user-123"],
      proposedDates: [],
      createdAt: 1700000000000,
      updatedAt: 1700000000000,
    },
  ];

  it("fetches user scheduler events when user is authenticated", async () => {
    vi.mocked(eventsApi.getUserSchedulerEvents).mockResolvedValueOnce(sampleEvents);
    const { result } = renderHookWithProviders(() => useGetUserSchedulerEventsRealtimeQuery(), { user: mockUser });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(eventsApi.getUserSchedulerEvents).toHaveBeenCalledWith("user-123");
    expect(result.current.data).toEqual(sampleEvents);
  });

  it("updates query data on realtime subscription callback", async () => {
    let capturedCallback: ((events: SchedulerEvent[]) => void) | undefined;
    vi.mocked(eventsApi.subscribeToUserSchedulerEvents).mockImplementation((_uid, cb) => {
      capturedCallback = cb;
      return vi.fn();
    });
    vi.mocked(eventsApi.getUserSchedulerEvents).mockResolvedValueOnce(sampleEvents);
    const { queryClient } = renderHookWithProviders(() => useGetUserSchedulerEventsRealtimeQuery(), { user: mockUser });

    expect(capturedCallback).toBeDefined();

    const updatedEvents: SchedulerEvent[] = [
      ...sampleEvents,
      {
        id: "evt-2",
        name: "Second Event",
        description: "New",
        creatorId: "user-123",
        participants: ["user-123"],
        proposedDates: [],
        createdAt: 1700000001000,
        updatedAt: 1700000001000,
      },
    ];

    act(() => {
      capturedCallback?.(updatedEvents);
    });

    expect(queryClient.getQueryData(eventKeys.userEvents("user-123"))).toEqual(updatedEvents);
  });

  it("does not subscribe and throws when user is unauthenticated", async () => {
    const { result } = renderHookWithProviders(() => useGetUserSchedulerEventsRealtimeQuery({ enabled: true }), { user: null });

    expect(eventsApi.subscribeToUserSchedulerEvents).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});
