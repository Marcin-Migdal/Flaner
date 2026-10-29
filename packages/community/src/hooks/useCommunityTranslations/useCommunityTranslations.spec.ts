import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTranslation } from "react-i18next";
import { useCommunityTranslations } from "./useCommunityTranslations";

vi.mock("react-i18next", () => ({
  useTranslation: vi.fn((ns: string) => ({
    t: (k: string) => `${ns}:${k}`,
    i18n: { language: "en" },
  })),
}));

describe("useCommunityTranslations hook", () => {
  it("calls useTranslation with 'community' namespace", () => {
    const { result } = renderHook(() => useCommunityTranslations());

    expect(useTranslation).toHaveBeenCalledWith("community");
    expect(result.current.t("title")).toBe("community:title");
  });
});
