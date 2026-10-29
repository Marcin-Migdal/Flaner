import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../../../api/events/types";
import {
  useGetUserSchedulerEventsRealtimeQuery,
  getUserSchedulerEventsRealtimeQueryKeys,
} from "./useGetUserSchedulerEventsRealtimeQuery";
import * as eventsApi from "../../../../api/events";

let mockUser: { uid: string } | null = { uid: "user-123" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/events", () => ({
  getUserSchedulerEvents: vi.fn(),
  subscribeToUserSchedulerEvents: vi.fn(() => vi.fn()),
}));

describe("useGetUserSchedulerEventsRealtimeQuery", () => {
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

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetUserSchedulerEventsRealtimeQuery(), { wrapper: Wrapper });

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

    const { Wrapper, queryClient } = createWrapper();
    renderHook(() => useGetUserSchedulerEventsRealtimeQuery(), { wrapper: Wrapper });

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

    expect(queryClient.getQueryData(getUserSchedulerEventsRealtimeQueryKeys("user-123"))).toEqual(updatedEvents);
  });

  it("does not subscribe and throws when user is unauthenticated", async () => {
    mockUser = null;

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetUserSchedulerEventsRealtimeQuery({ enabled: true }), {
      wrapper: Wrapper,
    });

    expect(eventsApi.subscribeToUserSchedulerEvents).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.userNotAuthenticated");
  });
});
