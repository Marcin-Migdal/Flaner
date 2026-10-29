import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../../../api/events/types";
import {
  useUserSchedulerEventsQuery,
  useInvalidateUserSchedulerEventsQuery,
  getUserSchedulerEventsQueryKeys,
} from "./useUserSchedulerEventsQuery";
import * as eventsEndpoints from "../../../../api/events/endpoints";

let mockUser: { uid: string } | null = { uid: "user-123" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/events/endpoints", () => ({
  getUserSchedulerEvents: vi.fn(),
}));

describe("useUserSchedulerEventsQuery", () => {
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

  it("fetches user scheduler events when user is authenticated", async () => {
    const mockEvents: SchedulerEvent[] = [
      {
        id: "evt-1",
        name: "Planning Session",
        description: "Sprint planning",
        creatorId: "user-123",
        participants: ["user-123"],
        proposedDates: [],
        createdAt: 1700000000000,
        updatedAt: 1700000000000,
      },
    ];
    vi.mocked(eventsEndpoints.getUserSchedulerEvents).mockResolvedValueOnce(mockEvents);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUserSchedulerEventsQuery(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(eventsEndpoints.getUserSchedulerEvents).toHaveBeenCalledWith("user-123");
    expect(result.current.data).toEqual(mockEvents);
  });

  it("throws error when queryFn executes and user is unauthenticated", async () => {
    mockUser = null;

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUserSchedulerEventsQuery({ enabled: true }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.userNotAuthenticated");
  });

  it("invalidates user scheduler events query when user is authenticated", () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateUserSchedulerEventsQuery(), { wrapper: Wrapper });
    result.current();

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getUserSchedulerEventsQueryKeys("user-123"),
    });
  });

  it("invalidates user scheduler events query when user is unauthenticated", () => {
    mockUser = null;
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateUserSchedulerEventsQuery(), { wrapper: Wrapper });
    result.current();

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getUserSchedulerEventsQueryKeys(undefined),
    });
  });
});
