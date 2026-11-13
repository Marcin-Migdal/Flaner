import { describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useDeleteEventMutation } from "./useDeleteEventMutation";
import * as eventsApi from "../../../../api/events";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/events", () => ({
  deleteSchedulerEvent: vi.fn(),
}));

describe("useDeleteEventMutation", () => {
  it("calls deleteSchedulerEvent on mutate and triggers onSuccess", async () => {
    vi.mocked(eventsApi.deleteSchedulerEvent).mockResolvedValueOnce(undefined);

    const onSuccessMock = vi.fn();
    const { result } = renderHookWithProviders(() => useDeleteEventMutation({ onSuccess: onSuccessMock }), { user: mockUser });

    act(() => {
      result.current.mutate("evt-1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.deleteSchedulerEvent).toHaveBeenCalledWith("evt-1");
    expect(onSuccessMock).toHaveBeenCalled();
  });

  it("throws error when user is unauthenticated", async () => {
    const { result } = renderHookWithProviders(() => useDeleteEventMutation(), { user: null });

    act(() => {
      result.current.mutate("evt-1");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });

  it("executes successfully without options", async () => {
    vi.mocked(eventsApi.deleteSchedulerEvent).mockResolvedValueOnce(undefined);
    const { result } = renderHookWithProviders(() => useDeleteEventMutation(), { user: mockUser });

    act(() => {
      result.current.mutate("evt-1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
