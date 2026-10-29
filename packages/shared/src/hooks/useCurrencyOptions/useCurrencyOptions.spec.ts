import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCurrencyOptions } from "./useCurrencyOptions";
import { SUPPORTED_CURRENCIES } from "../../constants/money";

let mockLanguage: string | undefined = "en-US";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: mockLanguage ? { language: mockLanguage } : undefined,
  }),
}));

describe("useCurrencyOptions", () => {
  it("returns options for all supported currencies", () => {
    mockLanguage = "en-US";
    const { result } = renderHook(() => useCurrencyOptions());

    expect(result.current).toHaveLength(SUPPORTED_CURRENCIES.length);

    const values = result.current.map((opt) => opt.value);
    expect(values).toEqual(expect.arrayContaining([...SUPPORTED_CURRENCIES]));

    const usdOption = result.current.find((opt) => opt.value === "USD");
    expect(usdOption?.label).toContain("USD");
    expect(usdOption?.label).toContain("US Dollar");
  });

  it("falls back to pl language when i18n is undefined", () => {
    mockLanguage = undefined;
    const { result } = renderHook(() => useCurrencyOptions());

    const plnOption = result.current.find((opt) => opt.value === "PLN");
    expect(plnOption?.label).toContain("PLN");
  });
});
