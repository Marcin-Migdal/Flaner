import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as endpoints from "./endpoints";
import type { ParticipantResult } from "./types";
import { useSearchParticipantsQuery } from "./queries";

vi.mock("./endpoints", () => ({
  searchParticipants: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useSearchParticipantsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not fetch when searchQuery is empty", () => {
    const { result } = renderHook(() => useSearchParticipantsQuery(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(endpoints.searchParticipants).not.toHaveBeenCalled();
  });

  it("fetches participants when searchQuery is provided", async () => {
    const mockParticipants: ParticipantResult[] = [
      {
        type: "user",
        id: "u-1",
        name: "Alice",
        username: "Alice",
        usernameLower: "alice",
      },
    ];
    vi.mocked(endpoints.searchParticipants).mockResolvedValueOnce(mockParticipants);

    const { result } = renderHook(() => useSearchParticipantsQuery("Ali"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockParticipants);
    expect(endpoints.searchParticipants).toHaveBeenCalledWith("Ali");
  });
});
