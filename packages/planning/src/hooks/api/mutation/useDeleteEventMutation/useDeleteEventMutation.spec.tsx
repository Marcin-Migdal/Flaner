import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useDeleteEventMutation } from "./useDeleteEventMutation";
import * as eventsApi from "../../../../api/events";

let mockUser: { uid: string } | null = { uid: "user-123" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/events", () => ({
  deleteSchedulerEvent: vi.fn(),
}));

describe("useDeleteEventMutation", () => {
  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("calls deleteSchedulerEvent on mutate and triggers onSuccess", async () => {
    vi.mocked(eventsApi.deleteSchedulerEvent).mockResolvedValueOnce(undefined);

    const onSuccessMock = vi.fn();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteEventMutation({ onSuccess: onSuccessMock }), { wrapper: Wrapper });

    act(() => {
      result.current.mutate("evt-1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.deleteSchedulerEvent).toHaveBeenCalledWith("evt-1");
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error when user is unauthenticated", async () => {
    mockUser = null;
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDeleteEventMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate("evt-1");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.userNotAuthenticated");
    mockUser = { uid: "user-123" };
  });
});
