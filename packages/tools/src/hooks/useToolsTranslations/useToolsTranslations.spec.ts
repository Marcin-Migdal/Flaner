import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTranslation } from "react-i18next";
import { useToolsTranslations } from "./useToolsTranslations";

vi.mock("react-i18next", () => ({
  useTranslation: vi.fn((ns: string) => ({
    t: (k: string) => `${ns}:${k}`,
    i18n: { language: "en" },
  })),
}));

describe("useToolsTranslations", () => {
  it("initializes useTranslation with 'tools' namespace", () => {
    const { result } = renderHook(() => useToolsTranslations());

    expect(useTranslation).toHaveBeenCalledWith("tools");
    expect(result.current.t("spooler.title")).toBe("tools:spooler.title");
    expect(result.current.i18n.language).toBe("en");
  });
});
