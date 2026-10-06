import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import type { SchedulerEvent } from "../../../../api/events/types";
import { useUnfinalizeEventMutation } from "./useUnfinalizeEventMutation";
import * as eventsApi from "../../../../api/events";

let mockUser: { uid: string; username: string; email: string } | null = {
  uid: "user-123",
  username: "Alice",
  email: "alice@flaner.app",
};

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/events", () => ({
  unfinalizeSchedulerEvent: vi.fn(),
}));

describe("useUnfinalizeEventMutation", () => {
  beforeEach(() => {
    mockUser = { uid: "user-123", username: "Alice", email: "alice@flaner.app" };
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

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

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUnfinalizeEventMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ event: sampleEvent });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.unfinalizeSchedulerEvent).toHaveBeenCalledWith(sampleEvent, mockUser);
  });

  it("calls custom onSuccess when provided in options", async () => {
    vi.mocked(eventsApi.unfinalizeSchedulerEvent).mockResolvedValueOnce(undefined);
    const onSuccess = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUnfinalizeEventMutation({ onSuccess }), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ event: sampleEvent });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccess).toHaveBeenCalled();
  });

  it("throws error when user is not authenticated", async () => {
    mockUser = null;

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUnfinalizeEventMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ event: sampleEvent });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.userNotAuthenticated");
  });
});
