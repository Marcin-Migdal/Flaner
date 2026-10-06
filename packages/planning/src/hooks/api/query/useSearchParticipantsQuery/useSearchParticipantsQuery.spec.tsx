import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import type { ParticipantResult } from "../../../../api/participants";
import {
  useSearchParticipantsQuery,
  useInvalidateSearchParticipantsQuery,
} from "./useSearchParticipantsQuery";
import * as participantsApi from "../../../../api/participants";

vi.mock("../../../../api/participants", () => ({
  searchParticipants: vi.fn(),
}));

describe("useSearchParticipantsQuery", () => {
  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

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

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSearchParticipantsQuery("Ali", "user-1"), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(participantsApi.searchParticipants).toHaveBeenCalledWith("Ali", "user-1");
    expect(result.current.data).toEqual(mockResults);
  });

  it("does not execute query when searchQuery is empty", () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useSearchParticipantsQuery(""), { wrapper: Wrapper });

    expect(result.current.isFetching).toBe(false);
    expect(participantsApi.searchParticipants).not.toHaveBeenCalled();
  });

  it("invalidates search participants query", () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateSearchParticipantsQuery(), { wrapper: Wrapper });
    result.current();

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["participants", "search"],
    });
  });
});
