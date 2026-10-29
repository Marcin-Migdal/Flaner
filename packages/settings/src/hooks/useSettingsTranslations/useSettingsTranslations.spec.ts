import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTranslation } from "react-i18next";
import useSettingsTranslations, { useSettingsTranslations as namedUseSettingsTranslations } from "./useSettingsTranslations";

vi.mock("react-i18next", () => ({
  useTranslation: vi.fn(),
}));

describe("useSettingsTranslations", () => {
  it("initializes useTranslation with 'settings' namespace", () => {
    const mockT = vi.fn();
    const mockI18n = { language: "en" };
    vi.mocked(useTranslation).mockReturnValue({
      t: mockT,
      i18n: mockI18n,
    } as unknown as ReturnType<typeof useTranslation>);

    const { result } = renderHook(() => useSettingsTranslations());

    expect(useTranslation).toHaveBeenCalledWith("settings");
    expect(result.current.t).toBe(mockT);
    expect(result.current.i18n).toBe(mockI18n);
  });

  it("exports both default and named useSettingsTranslations", () => {
    expect(useSettingsTranslations).toBe(namedUseSettingsTranslations);
  });
});
