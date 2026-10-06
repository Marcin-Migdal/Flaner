import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMoneyFormatter } from "../useMoneyFormatter";

let mockLanguage: string | undefined = "en-US";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: mockLanguage ? { language: mockLanguage } : undefined,
  }),
}));

describe("useMoneyFormatter", () => {
  it("formats single money amount using active locale", () => {
    mockLanguage = "en-US";
    const { result } = renderHook(() => useMoneyFormatter());
    const formatted = result.current.format(2500, "USD");
    expect(formatted).toBe("$25.00");
  });

  it("formats multiple currency amounts via formatList", () => {
    mockLanguage = "en-US";
    const { result } = renderHook(() => useMoneyFormatter());
    const formatted = result.current.formatList(
      { USD: 1000, EUR: 2000 },
      "USD"
    );
    expect(formatted).toContain("$10.00");
    expect(formatted).toContain("€20.00");
    expect(formatted).toContain("·");
  });

  it("falls back to pl locale when i18n is undefined", () => {
    mockLanguage = undefined;
    const { result } = renderHook(() => useMoneyFormatter());
    const formatted = result.current.format(2500, "PLN");
    expect(formatted).toMatch(/25/);
  });
});
