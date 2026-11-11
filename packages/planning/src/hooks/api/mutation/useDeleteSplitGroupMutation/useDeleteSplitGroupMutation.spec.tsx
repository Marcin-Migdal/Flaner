import { describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useDeleteSplitGroupMutation } from "./useDeleteSplitGroupMutation";
import * as splitsApi from "../../../../api/splits";

const mockUser = createMockUser({ uid: "user-123", username: "Alice", email: "alice@flaner.app" });

vi.mock("../../../../api/splits", () => ({
  deleteSplitGroup: vi.fn(),
}));

describe("useDeleteSplitGroupMutation", () => {
  it("calls deleteSplitGroup on mutate", async () => {
    vi.mocked(splitsApi.deleteSplitGroup).mockResolvedValueOnce(undefined);
    const { result } = renderHookWithProviders(() => useDeleteSplitGroupMutation(), { user: mockUser });

    act(() => {
      result.current.mutate("grp-1");
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(splitsApi.deleteSplitGroup).toHaveBeenCalledWith("grp-1", "user-123");
  });

  it("throws error when user is unauthenticated", async () => {
    const { result } = renderHookWithProviders(() => useDeleteSplitGroupMutation(), { user: null });

    act(() => {
      result.current.mutate("grp-1");
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});
