import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useUpdateEventMutation } from "./useUpdateEventMutation";
import * as eventsApi from "../../../../api/events";

const mockUser = createMockUser({ uid: "user-123" });

vi.mock("../../../../api/events", () => ({
  updateSchedulerEvent: vi.fn(),
}));

describe("useUpdateEventMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls updateSchedulerEvent on mutate", async () => {
    vi.mocked(eventsApi.updateSchedulerEvent).mockResolvedValueOnce(undefined);
    const { result } = renderHookWithProviders(() => useUpdateEventMutation(), { user: mockUser });

    act(() => {
      result.current.mutate({ eventId: "evt-1", data: { name: "Updated Name" } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(eventsApi.updateSchedulerEvent).toHaveBeenCalledWith("evt-1", { name: "Updated Name" });
  });

  it("calls custom onSuccess when provided in options", async () => {
    vi.mocked(eventsApi.updateSchedulerEvent).mockResolvedValueOnce(undefined);
    const onSuccess = vi.fn();
    const { result } = renderHookWithProviders(() => useUpdateEventMutation({ onSuccess }), { user: mockUser });

    act(() => {
      result.current.mutate({ eventId: "evt-1", data: { name: "Updated Name" } });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccess).toHaveBeenCalled();
  });

  it("throws error when user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useUpdateEventMutation(), { user: null });

    act(() => {
      result.current.mutate({ eventId: "evt-1", data: { name: "Updated Name" } });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});
