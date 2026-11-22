import { describe, expect, it } from "vitest";
import { getLocaleCurrency } from "./localeCurrency";

describe("getLocaleCurrency", () => {
  it("maps the locale's region to its currency", () => {
    expect(getLocaleCurrency("pl-PL")).toBe("PLN");
    expect(getLocaleCurrency("de-DE")).toBe("EUR");
    expect(getLocaleCurrency("en-GB")).toBe("GBP");
    expect(getLocaleCurrency("pl")).toBe("PLN");
    expect(getLocaleCurrency("en")).toBe("USD");
  });

  it("falls back to the default currency for unknown or invalid locales", () => {
    expect(getLocaleCurrency("en-AQ")).toBe("PLN");
    expect(getLocaleCurrency("not a locale")).toBe("PLN");
  });
});
