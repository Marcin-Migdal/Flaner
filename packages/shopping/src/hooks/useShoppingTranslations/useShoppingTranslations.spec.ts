import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTranslation } from "react-i18next";
import useShoppingTranslations, { useShoppingTranslations as namedUseShoppingTranslations } from "./useShoppingTranslations";

vi.mock("react-i18next", () => ({
  useTranslation: vi.fn((ns: string) => ({
    t: (k: string) => `${ns}:${k}`,
    i18n: { language: "en" },
  })),
}));

describe("useShoppingTranslations", () => {
  it("initializes useTranslation with 'shopping' namespace", () => {
    const { result } = renderHook(() => useShoppingTranslations());

    expect(useTranslation).toHaveBeenCalledWith("shopping");
    expect(result.current.t("title")).toBe("shopping:title");
    expect(result.current.i18n.language).toBe("en");
  });

  it("exports both default and named useShoppingTranslations", () => {
    expect(useShoppingTranslations).toBe(namedUseShoppingTranslations);
  });
});
