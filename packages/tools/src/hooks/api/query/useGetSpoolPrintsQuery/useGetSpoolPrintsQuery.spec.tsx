import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import * as spoolsApi from "../../../../api/spools";
import {
  useGetSpoolPrintsQuery,
  useInvalidateGetSpoolPrintsQuery,
  getSpoolPrintsQueryKeys,
} from "./useGetSpoolPrintsQuery";

vi.mock("../../../../api/spools", () => ({
  fetchSpoolPrints: vi.fn(),
}));

describe("useGetSpoolPrintsQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper, queryClient };
  };

  it("fetches spool prints for a given spoolId", async () => {
    const mockPrints = [
      {
        id: "p1",
        usedWeight: 65,
        createdAt: null,
      },
    ];
    vi.mocked(spoolsApi.fetchSpoolPrints).mockResolvedValueOnce(mockPrints);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useGetSpoolPrintsQuery("spool-1"), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spoolsApi.fetchSpoolPrints).toHaveBeenCalledWith("spool-1");
    expect(result.current.data).toEqual(mockPrints);
  });

  it("invalidates spool prints query", async () => {
    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useInvalidateGetSpoolPrintsQuery(), { wrapper: Wrapper });
    result.current("spool-1");

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: getSpoolPrintsQueryKeys("spool-1"),
    });

    result.current();
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["spoolPrints"],
    });
  });

  it("returns empty array when queryFn runs without spoolId", async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => useGetSpoolPrintsQuery(undefined, { enabled: true }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});
