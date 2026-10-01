import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTranslation } from "react-i18next";
import { useUiTranslations } from "./useUiTranslations";

vi.mock("react-i18next", () => ({
  useTranslation: vi.fn((ns: string) => ({
    t: (k: string) => `${ns}:${k}`,
    i18n: { language: "en" },
  })),
}));

describe("useUiTranslations hook", () => {
  it("calls useTranslation with 'ui' namespace", () => {
    const { result } = renderHook(() => useUiTranslations());

    expect(useTranslation).toHaveBeenCalledWith("ui");
    expect(result.current.t("save")).toBe("ui:save");
  });
});
