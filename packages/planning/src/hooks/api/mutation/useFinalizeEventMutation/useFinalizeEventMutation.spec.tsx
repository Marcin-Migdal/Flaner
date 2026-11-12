import { describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useFinalizeEventMutation } from "./useFinalizeEventMutation";
import * as eventsApi from "../../../../api/events";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/events", () => ({
  updateSchedulerEvent: vi.fn(),
}));

describe("useFinalizeEventMutation", () => {
  it("calls updateSchedulerEvent on mutate and triggers onSuccess", async () => {
    vi.mocked(eventsApi.updateSchedulerEvent).mockResolvedValueOnce(undefined);

    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useFinalizeEventMutation({ onSuccess: onSuccessMock }), { user: mockUser });

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
    const { result } = renderHookWithProviders(() => useFinalizeEventMutation(), { user: null });

    act(() => {
      result.current.mutate({ eventId: "evt-1", finalizedSlotIndex: 0 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("executes successfully without options", async () => {
    vi.mocked(eventsApi.updateSchedulerEvent).mockResolvedValueOnce(undefined);
    const { result } = renderHookWithProviders(() => useFinalizeEventMutation(), { user: mockUser });

    act(() => {
      result.current.mutate({ eventId: "evt-1", finalizedSlotIndex: 1 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
