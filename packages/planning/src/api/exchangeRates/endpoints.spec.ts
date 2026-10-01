import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getExchangeRate } from "./endpoints";

describe("exchangeRates endpoints - getExchangeRate", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns rate 1 when from and to currencies are identical without calling fetch", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;

    const result = await getExchangeRate("EUR", "EUR", "2026-06-01");
    expect(result).toEqual({ rate: 1, date: "2026-06-01" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fetches rate and returns matched rate", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([
        { base: "EUR", quote: "USD", rate: 1.08, date: "2026-06-01" },
      ]),
    });

    const result = await getExchangeRate("EUR", "USD", "2026-06-01");
    expect(result).toEqual({ rate: 1.08, date: "2026-06-01" });
  });

  it("throws error when fetch response is not ok", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    await expect(getExchangeRate("EUR", "USD", "2026-06-01")).rejects.toThrow(
      "Exchange rate request failed with status 500",
    );
  });

  it("throws error when returned data does not match quote", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue([
        { base: "EUR", quote: "GBP", rate: 0.85, date: "2026-06-01" },
      ]),
    });

    await expect(getExchangeRate("EUR", "USD", "2026-06-01")).rejects.toThrow(
      "Exchange rate EUR/USD for 2026-06-01 is not available",
    );
  });
});
