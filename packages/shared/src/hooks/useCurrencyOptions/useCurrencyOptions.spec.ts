import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCurrencyOptions } from "./useCurrencyOptions";
import { SUPPORTED_CURRENCIES } from "../../constants/money";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: "en-US" },
  }),
}));

describe("useCurrencyOptions", () => {
  it("returns options for all supported currencies", () => {
    const { result } = renderHook(() => useCurrencyOptions());

    expect(result.current).toHaveLength(SUPPORTED_CURRENCIES.length);

    const values = result.current.map((opt) => opt.value);
    expect(values).toEqual(expect.arrayContaining([...SUPPORTED_CURRENCIES]));

    const usdOption = result.current.find((opt) => opt.value === "USD");
    expect(usdOption?.label).toContain("USD");
    expect(usdOption?.label).toContain("US Dollar");
  });
});
