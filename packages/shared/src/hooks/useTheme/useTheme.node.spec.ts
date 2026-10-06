// @vitest-environment node
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { useTheme } from "./useTheme";

describe("useTheme in SSR", () => {
  it("defaults to dark theme when document is undefined in SSR environment", () => {
    let capturedTheme: string | undefined;

    function TestComponent() {
      const { theme, isDark } = useTheme();
      capturedTheme = theme;
      return React.createElement("div", null, isDark ? "dark" : "light");
    }

    const html = renderToString(React.createElement(TestComponent));
    expect(capturedTheme).toBe("dark");
    expect(html).toContain("dark");
  });
});
