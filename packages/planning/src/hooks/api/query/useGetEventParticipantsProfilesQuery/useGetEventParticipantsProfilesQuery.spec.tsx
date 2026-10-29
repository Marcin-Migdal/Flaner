import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import {
  useGetEventParticipantsProfilesQuery,
  useInvalidateEventParticipantsProfilesQuery,
  getEventParticipantsProfilesQueryKeys,
} from "./useGetEventParticipantsProfilesQuery";
import * as participantsApi from "../../../../api/participants";

vi.mock("../../../../api/participants", () => ({
  getEventParticipantsProfiles: vi.fn(),
}));

describe("useGetEventParticipantsProfilesQuery", () => {
  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("fetches event participants profiles when userIds is non-empty", async () => {
    const mockProfiles = [
      { id: "u1", name: "User 1", avatarUrl: "https://example.com/1.png", type: "group" as const },
    ];
    vi.mocked(participantsApi.getEventParticipantsProfiles).mockResolvedValueOnce(mockProfiles);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetEventParticipantsProfilesQuery(["u1"]), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(participantsApi.getEventParticipantsProfiles).toHaveBeenCalledWith(["u1"]);
    expect(result.current.data).toEqual(mockProfiles);
  });

  it("invalidates participants profiles query", () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateEventParticipantsProfilesQuery(), { wrapper: Wrapper });
    result.current(["u1"]);

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getEventParticipantsProfilesQueryKeys(["u1"]),
    });
  });
});
