import { describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@flaner/test-utils";
import { useGetEventParticipantsProfilesQuery } from "./useGetEventParticipantsProfilesQuery";
import * as participantsApi from "../../../../api/participants";

vi.mock("../../../../api/participants", () => ({
  getEventParticipantsProfiles: vi.fn(),
}));

describe("useGetEventParticipantsProfilesQuery", () => {
  it("fetches event participants profiles when userIds is non-empty", async () => {
    const mockProfiles = [
      { id: "u1", name: "User 1", avatarUrl: "https://example.com/1.png", type: "group" as const },
    ];
    vi.mocked(participantsApi.getEventParticipantsProfiles).mockResolvedValueOnce(mockProfiles);
    const { result } = renderHookWithProviders(() => useGetEventParticipantsProfilesQuery(["u1"]));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(participantsApi.getEventParticipantsProfiles).toHaveBeenCalledWith(["u1"]);
    expect(result.current.data).toEqual(mockProfiles);
  });

  it("keys by the sorted ids without reordering the caller's array (it may be cached realtime data)", async () => {
    vi.mocked(participantsApi.getEventParticipantsProfiles).mockResolvedValueOnce([]);
    const userIds = ["u2", "u1"];
    const { result, queryClient } = renderHookWithProviders(() => useGetEventParticipantsProfilesQuery(userIds));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(userIds).toEqual(["u2", "u1"]);
    expect(queryClient.getQueryData(["participants", "profiles", "u1,u2"])).toEqual([]);
  });
});
