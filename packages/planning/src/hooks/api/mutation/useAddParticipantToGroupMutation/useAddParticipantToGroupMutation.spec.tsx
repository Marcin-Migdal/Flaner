import { describe, expect, it, vi } from "vitest";
import { waitFor, act } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useAddParticipantToGroupMutation } from "./useAddParticipantToGroupMutation";
import * as splitsApi from "../../../../api/splits";

const mockUser = createMockUser({ uid: "user-123", username: "Alice", email: "alice@flaner.app" });

vi.mock("../../../../api/splits", () => ({
  addParticipantToGroup: vi.fn(),
}));

describe("useAddParticipantToGroupMutation", () => {
  it("calls addParticipantToGroup on mutate", async () => {
    vi.mocked(splitsApi.addParticipantToGroup).mockResolvedValueOnce(undefined);
    const { result } = renderHookWithProviders(() => useAddParticipantToGroupMutation(), { user: mockUser });

    act(() => {
      result.current.mutate({ groupId: "grp-1", participantId: "user-456" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(splitsApi.addParticipantToGroup).toHaveBeenCalledWith("grp-1", "user-456", mockUser);
  });

  it("throws error when user is unauthenticated", async () => {
    const { result } = renderHookWithProviders(() => useAddParticipantToGroupMutation(), { user: null });

    act(() => {
      result.current.mutate({ groupId: "grp-1", participantId: "user-456" });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});
