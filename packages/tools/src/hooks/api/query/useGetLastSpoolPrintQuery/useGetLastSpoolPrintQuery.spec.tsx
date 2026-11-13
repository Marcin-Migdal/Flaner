import { describe, it, expect, vi, beforeEach } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderHookWithProviders } from "@flaner/test-utils";
import * as spoolsApi from "../../../../api/spools";
import { spoolerKeys } from "../../queryKeys";
import { useGetLastSpoolPrintQuery } from "./useGetLastSpoolPrintQuery";

vi.mock("../../../../api/spools", () => ({
  fetchLastPrint: vi.fn(),
}));

describe("useGetLastSpoolPrintQuery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for a spool without prints", async () => {
    vi.mocked(spoolsApi.fetchLastPrint).mockResolvedValueOnce(null);

    const { result } = renderHookWithProviders(() => useGetLastSpoolPrintQuery("spool-1"));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(spoolsApi.fetchLastPrint).toHaveBeenCalledWith("spool-1");
  });

  it("refetches when the spool's prints key is invalidated (record usage / undo)", async () => {
    vi.mocked(spoolsApi.fetchLastPrint).mockResolvedValue(null);
    const { result, queryClient } = renderHookWithProviders(() => useGetLastSpoolPrintQuery("spool-1"));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await queryClient.invalidateQueries({ queryKey: spoolerKeys.prints("spool-1") });

    await waitFor(() => expect(spoolsApi.fetchLastPrint).toHaveBeenCalledTimes(2));
  });
});
