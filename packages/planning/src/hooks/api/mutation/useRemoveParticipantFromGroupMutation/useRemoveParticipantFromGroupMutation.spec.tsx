import { describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useRemoveParticipantFromGroupMutation } from "./useRemoveParticipantFromGroupMutation";
import * as splitsApi from "../../../../api/splits";

const mockUser = createMockUser({ uid: "user-123", username: "Alice", email: "alice@flaner.app" });

vi.mock("../../../../api/splits", () => ({
  removeParticipantFromGroup: vi.fn(),
}));

describe("useRemoveParticipantFromGroupMutation", () => {
  it("calls removeParticipantFromGroup on mutate", async () => {
    vi.mocked(splitsApi.removeParticipantFromGroup).mockResolvedValueOnce(undefined);
    const { result } = renderHookWithProviders(() => useRemoveParticipantFromGroupMutation(), { user: mockUser });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        participantId: "user-456",
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(splitsApi.removeParticipantFromGroup).toHaveBeenCalledWith("grp-1", "user-456");
  });

  it("throws error when user is unauthenticated", async () => {
    const { result } = renderHookWithProviders(() => useRemoveParticipantFromGroupMutation(), { user: null });

    act(() => {
      result.current.mutate({
        groupId: "grp-1",
        participantId: "user-456",
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});
