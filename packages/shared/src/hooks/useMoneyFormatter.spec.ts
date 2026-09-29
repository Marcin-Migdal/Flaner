import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMoneyFormatter } from "./useMoneyFormatter";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en-US" },
  }),
}));

describe("useMoneyFormatter", () => {
  it("formats single money amount using active locale", () => {
    const { result } = renderHook(() => useMoneyFormatter());
    const formatted = result.current.format(2500, "USD");
    expect(formatted).toBe("$25.00");
  });

  it("formats multiple currency amounts via formatList", () => {
    const { result } = renderHook(() => useMoneyFormatter());
    const formatted = result.current.formatList(
      { USD: 1000, EUR: 2000 },
      "USD"
    );
    expect(formatted).toContain("$10.00");
    expect(formatted).toContain("€20.00");
    expect(formatted).toContain("·");
  });
});
