import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import { useAddParticipantToGroupMutation } from "./useAddParticipantToGroupMutation";
import * as splitsApi from "../../../../api/splits";

let mockUser: { uid: string; username: string; email: string } | null = { uid: "user-123", username: "Alice", email: "alice@flaner.app" };

vi.mock("@flaner/shared/context", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("../../../../api/splits", () => ({
  addParticipantToGroup: vi.fn(),
}));

describe("useAddParticipantToGroupMutation", () => {
  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("calls addParticipantToGroup on mutate", async () => {
    vi.mocked(splitsApi.addParticipantToGroup).mockResolvedValueOnce(undefined);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAddParticipantToGroupMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ groupId: "grp-1", participantId: "user-456" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(splitsApi.addParticipantToGroup).toHaveBeenCalledWith("grp-1", "user-456", mockUser);
  });

  it("throws error when user is unauthenticated", async () => {
    mockUser = null;
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useAddParticipantToGroupMutation(), { wrapper: Wrapper });

    act(() => {
      result.current.mutate({ groupId: "grp-1", participantId: "user-456" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("planning:errors.userNotAuthenticated");
    mockUser = { uid: "user-123", username: "Alice", email: "alice@flaner.app" };
  });
});
