import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@flaner/test-utils";
import * as spoolsApi from "../../../../api/spools";
import { useInvalidateGetSpoolPrintsQuery } from "../useGetSpoolPrintsQuery";
import { useGetLastSpoolPrintQuery } from "./useGetLastSpoolPrintQuery";

vi.mock("../../../../api/spools", () => ({
  fetchLastPrint: vi.fn(),
}));

describe("useGetLastSpoolPrintQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createWrapper = () => {
    const queryClient = createTestQueryClient();
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return { Wrapper };
  };

  it("returns null for a spool without prints", async () => {
    vi.mocked(spoolsApi.fetchLastPrint).mockResolvedValueOnce(null);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useGetLastSpoolPrintQuery("spool-1"), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(spoolsApi.fetchLastPrint).toHaveBeenCalledWith("spool-1");
  });

  it("refetches when the spool prints query is invalidated", async () => {
    vi.mocked(spoolsApi.fetchLastPrint).mockResolvedValue(null);
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => ({ last: useGetLastSpoolPrintQuery("spool-1"), invalidate: useInvalidateGetSpoolPrintsQuery() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.last.isSuccess).toBe(true));

    await result.current.invalidate("spool-1");

    await waitFor(() => expect(spoolsApi.fetchLastPrint).toHaveBeenCalledTimes(2));
  });
});
