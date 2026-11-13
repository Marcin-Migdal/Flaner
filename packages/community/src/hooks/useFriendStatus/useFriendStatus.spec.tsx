import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import { useFriendStatus } from "./useFriendStatus";
import * as usersApi from "../../api/users";
import type { FriendRequest } from "../../api/users";

vi.mock("../../api/users", () => ({
  getFriendsList: vi.fn(),
  subscribeToFriendsList: vi.fn(),
  getSentFriendRequests: vi.fn(),
  subscribeToSentFriendRequests: vi.fn(),
  getReceivedFriendRequests: vi.fn(),
  subscribeToReceivedFriendRequests: vi.fn(),
}));

const me = createMockUser({ uid: "me" });

const request = (senderUid: string, receiverUid: string): FriendRequest => ({
  id: `${senderUid}_${receiverUid}`,
  senderUid,
  receiverUid,
  senderUsername: senderUid,
  senderAvatarUrl: "",
  receiverUsername: receiverUid,
  receiverAvatarUrl: "",
  status: "pending",
  createdAt: 1,
});

describe("useFriendStatus", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(usersApi.getFriendsList).mockResolvedValue([{ uid: "friend", createdAt: 1 }]);
    vi.mocked(usersApi.getSentFriendRequests).mockResolvedValue([request("me", "outgoing"), request("me", "both")]);
    vi.mocked(usersApi.getReceivedFriendRequests).mockResolvedValue([request("incoming", "me"), request("both", "me")]);
    vi.mocked(usersApi.subscribeToFriendsList).mockReturnValue(() => {});
    vi.mocked(usersApi.subscribeToSentFriendRequests).mockReturnValue(() => {});
    vi.mocked(usersApi.subscribeToReceivedFriendRequests).mockReturnValue(() => {});
  });

  it.each([
    ["me", "self"],
    ["friend", "friend"],
    ["outgoing", "outgoing"],
    ["incoming", "incoming"],
    ["both", "incoming"],
    ["stranger", "none"],
  ])("returns the status of %s: %s", async (uid, expected) => {
    const { result } = renderHookWithProviders(() => useFriendStatus(), { user: me });

    await waitFor(() => expect(result.current(uid)).toBe(expected));
  });

  it("does not load the lists when disabled", () => {
    const { result } = renderHookWithProviders(() => useFriendStatus({ enabled: false }), { user: me });

    expect(result.current("friend")).toBe("none");
    expect(usersApi.getFriendsList).not.toHaveBeenCalled();
    expect(usersApi.subscribeToFriendsList).not.toHaveBeenCalled();
  });
});
