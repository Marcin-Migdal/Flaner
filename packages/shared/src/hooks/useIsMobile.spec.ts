import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIsMobile } from "./useIsMobile";

describe("useIsMobile", () => {
  let changeHandler: (() => void) | null = null;

  beforeEach(() => {
    changeHandler = null;
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === "change") changeHandler = handler;
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  it("returns true when innerWidth is below mobile breakpoint", () => {
    window.innerWidth = 500;
    const { result } = renderHook(() => useIsMobile(768));
    expect(result.current).toBe(true);
  });

  it("returns false when innerWidth is above mobile breakpoint", () => {
    window.innerWidth = 1024;
    const { result } = renderHook(() => useIsMobile(768));
    expect(result.current).toBe(false);
  });

  it("updates state on media query change event", () => {
    window.innerWidth = 1024;
    const { result } = renderHook(() => useIsMobile(768));
    expect(result.current).toBe(false);

    // Simulate resizing to mobile
    window.innerWidth = 480;
    act(() => {
      changeHandler?.();
    });

    expect(result.current).toBe(true);
  });
});
