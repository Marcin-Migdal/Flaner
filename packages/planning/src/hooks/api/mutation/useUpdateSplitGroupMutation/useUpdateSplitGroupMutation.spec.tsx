import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useUpdateSplitGroupMutation } from "./useUpdateSplitGroupMutation";
import * as splitsApi from "../../../../api/splits";

let mockUser: { uid: string; username: string; email: string } | null = {
  uid: "user-123",
  username: "Alice",
  email: "alice@flaner.app",
};

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/splits", () => ({
  updateSplitGroup: vi.fn(),
}));

describe("useUpdateSplitGroupMutation", () => {
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

  it("calls updateSplitGroup on mutate", async () => {
    vi.mocked(splitsApi.updateSplitGroup).mockResolvedValueOnce(undefined);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateSplitGroupMutation(), { wrapper: Wrapper });

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

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateSplitGroupMutation({ onSuccess }), { wrapper: Wrapper });

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
    mockUser = null;

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useUpdateSplitGroupMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        data: {
          name: "Updated Trip",
        },
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.userNotAuthenticated");
  });
});
