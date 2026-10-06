import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useUpdateEventMutation } from "./useUpdateEventMutation";
import * as eventsApi from "../../../../api/events";

let mockUser: { uid: string } | null = { uid: "user-123" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/events", () => ({
  updateSchedulerEvent: vi.fn(),
}));

describe("useUpdateEventMutation", () => {
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

  it("calls updateSchedulerEvent on mutate", async () => {
    vi.mocked(eventsApi.updateSchedulerEvent).mockResolvedValueOnce(undefined);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateEventMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ eventId: "evt-1", data: { name: "Updated Name" } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.updateSchedulerEvent).toHaveBeenCalledWith("evt-1", { name: "Updated Name" });
  });

  it("calls custom onSuccess when provided in options", async () => {
    vi.mocked(eventsApi.updateSchedulerEvent).mockResolvedValueOnce(undefined);
    const onSuccess = vi.fn();

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateEventMutation({ onSuccess }), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ eventId: "evt-1", data: { name: "Updated Name" } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccess).toHaveBeenCalled();
  });

  it("throws error when user is not authenticated", async () => {
    mockUser = null;

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateEventMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ eventId: "evt-1", data: { name: "Updated Name" } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.userNotAuthenticated");
  });
});
