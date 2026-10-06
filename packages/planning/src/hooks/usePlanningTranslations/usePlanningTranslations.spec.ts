import React from "react";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nextProvider } from "react-i18next";
import { createTestI18n } from "@flaner/test-utils";
import { usePlanningTranslations } from "./usePlanningTranslations";

describe("usePlanningTranslations", () => {
  it("returns translation functions with planning namespace", () => {
    const i18n = createTestI18n();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(I18nextProvider, { i18n }, children);

    const { result } = renderHook(() => usePlanningTranslations(), { wrapper });
    expect(result.current.t).toBeDefined();
    expect(result.current.i18n).toBeDefined();
  });
});
