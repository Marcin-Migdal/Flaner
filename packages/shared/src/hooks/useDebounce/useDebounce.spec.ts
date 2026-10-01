import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "./useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial value immediately upon mount", () => {
    const { result } = renderHook(() => useDebounce("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("updates debounced value only after the specified delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "first", delay: 300 } }
    );

    expect(result.current).toBe("first");

    // Change input value
    rerender({ value: "second", delay: 300 });

    // Value should still be old before timer expires
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe("first");

    // Fast-forward remaining time
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("second");
  });

  it("resets delay timer if value changes rapidly", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 300 } }
    );

    rerender({ value: "ab", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    rerender({ value: "abc", delay: 300 });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    // Total 300ms elapsed, but only 150ms since last change
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(150);
    });
    // Now 300ms after "abc"
    expect(result.current).toBe("abc");
  });
});
