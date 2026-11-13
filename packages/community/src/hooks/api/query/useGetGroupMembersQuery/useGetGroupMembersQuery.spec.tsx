import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@flaner/test-utils";
import { useGetGroupMembersQuery } from "./useGetGroupMembersQuery";
import * as groupsApi from "../../../../api/groups";
import type { GroupMember } from "../../../../api/groups";

vi.mock("../../../../api/groups", () => ({
  getGroupMembers: vi.fn(),
  subscribeToGroupMembers: vi.fn(() => () => {}),
}));

describe("useGetGroupMembersQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches members for a group", async () => {
    const mockMembers: GroupMember[] = [
      { userId: "u-1", role: "owner", joinedAt: 100 },
      { userId: "u-2", role: "member", joinedAt: 200 },
    ];
    vi.mocked(groupsApi.getGroupMembers).mockResolvedValueOnce(mockMembers);
    const { result } = renderHookWithProviders(() => useGetGroupMembersQuery("grp-123"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockMembers);
    expect(groupsApi.getGroupMembers).toHaveBeenCalledWith("grp-123");
  });

  it("applies live snapshots from the Firestore listener", async () => {
    vi.mocked(groupsApi.getGroupMembers).mockResolvedValueOnce([]);
    let push: (data: GroupMember[]) => void = () => {};
    vi.mocked(groupsApi.subscribeToGroupMembers).mockImplementationOnce((_groupId, onUpdate) => {
      push = onUpdate;
      return () => {};
    });
    const live: GroupMember[] = [{ userId: "u-2", role: "member", joinedAt: 2 }];
    const { result } = renderHookWithProviders(() => useGetGroupMembersQuery("grp-123"));
    await waitFor(() => expect(result.current.data).toBeDefined());

    act(() => push(live));
    await waitFor(() => expect(result.current.data).toEqual(live));
  });
});

