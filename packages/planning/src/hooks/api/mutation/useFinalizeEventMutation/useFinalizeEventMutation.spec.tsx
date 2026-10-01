import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useFinalizeEventMutation } from "./useFinalizeEventMutation";
import * as eventsApi from "../../../../api/events";

let mockUser: { uid: string } | null = { uid: "user-123" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/events", () => ({
  updateSchedulerEvent: vi.fn(),
}));

describe("useFinalizeEventMutation", () => {
  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("calls updateSchedulerEvent on mutate and triggers onSuccess", async () => {
    vi.mocked(eventsApi.updateSchedulerEvent).mockResolvedValueOnce(undefined);

    const onSuccessMock = vi.fn();
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useFinalizeEventMutation({ onSuccess: onSuccessMock }), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ eventId: "evt-1", finalizedSlotIndex: 0 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.updateSchedulerEvent).toHaveBeenCalledWith("evt-1", {
      isFinalized: true,
      finalizedSlotIndex: 0,
    });
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error when user is unauthenticated", async () => {
    mockUser = null;
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useFinalizeEventMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ eventId: "evt-1", finalizedSlotIndex: 0 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.userNotAuthenticated");
    mockUser = { uid: "user-123" };
  });
});
