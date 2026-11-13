import { beforeEach, describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useUpdateSplitGroupMutation } from "./useUpdateSplitGroupMutation";
import * as splitsApi from "../../../../api/splits";

const mockUser = createMockUser({
  uid: "user-123",
  username: "Alice",
  email: "alice@flaner.app",
});

vi.mock("../../../../api/splits", () => ({
  updateSplitGroup: vi.fn(),
}));

describe("useUpdateSplitGroupMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls updateSplitGroup on mutate", async () => {
    vi.mocked(splitsApi.updateSplitGroup).mockResolvedValueOnce(undefined);
    const { result } = renderHookWithProviders(() => useUpdateSplitGroupMutation(), { user: mockUser });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        data: {
          name: "Updated Trip",
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(splitsApi.updateSplitGroup).toHaveBeenCalledWith("grp-1", { name: "Updated Trip" });
  });

  it("calls custom onSuccess when provided in options", async () => {
    vi.mocked(splitsApi.updateSplitGroup).mockResolvedValueOnce(undefined);
    const onSuccess = vi.fn();
    const { result } = renderHookWithProviders(() => useUpdateSplitGroupMutation({ onSuccess }), { user: mockUser });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        data: {
          name: "Updated Trip",
        },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(onSuccess).toHaveBeenCalled();
  });

  it("throws error when user is not authenticated", async () => {
    const { result } = renderHookWithProviders(() => useUpdateSplitGroupMutation(), { user: null });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        data: {
          name: "Updated Trip",
        },
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});
