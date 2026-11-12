import { describe, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@flaner/test-utils";
import type { ParticipantResult } from "../../../../api/participants";
import { useSearchParticipantsQuery } from "./useSearchParticipantsQuery";
import * as participantsApi from "../../../../api/participants";

vi.mock("../../../../api/participants", () => ({
  searchParticipants: vi.fn(),
}));

describe("useSearchParticipantsQuery", () => {
  it("searches participants when searchQuery is not empty", async () => {
    const mockResults: ParticipantResult[] = [
      {
        id: "u1",
        name: "Alice",
        type: "user",
        username: "Alice",
        usernameLower: "alice",
        avatarUrl: "https://example.com/avatar.png",
      },
    ];
    vi.mocked(participantsApi.searchParticipants).mockResolvedValueOnce(mockResults);
    const { result } = renderHookWithProviders(() => useSearchParticipantsQuery("Ali", "user-1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(participantsApi.searchParticipants).toHaveBeenCalledWith("Ali", "user-1");
    expect(result.current.data).toEqual(mockResults);
  });

  it("does not execute query when searchQuery is empty", () => {
    const { result } = renderHookWithProviders(() => useSearchParticipantsQuery(""));

    expect(result.current.isFetching).toBe(false);
    expect(participantsApi.searchParticipants).not.toHaveBeenCalled();
  });

  it("caches under the participants search key", async () => {
    vi.mocked(participantsApi.searchParticipants).mockResolvedValueOnce([]);
    const { result, queryClient } = renderHookWithProviders(() => useSearchParticipantsQuery("Ali", "user-1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(["participants", "search", "Ali", "user-1"])).toEqual([]);
  });
});
