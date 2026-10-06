import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBlocker, NavigationType, type BlockerFunction, type Blocker } from "react-router";
import { useUnsavedChangesWarning } from "./useUnsavedChangesWarning";

vi.mock("react-router", () => ({
  useBlocker: vi.fn(),
  NavigationType: {
    Pop: "POP",
    Push: "PUSH",
    Replace: "REPLACE",
  },
}));

describe("useUnsavedChangesWarning", () => {
  let capturedBlockerFn: BlockerFunction | null = null;
  const mockBlocker: Blocker = {
    state: "unblocked",
    proceed: undefined,
    reset: undefined,
    location: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    capturedBlockerFn = null;
    vi.mocked(useBlocker).mockImplementation((fn) => {
      if (typeof fn === "function") {
        capturedBlockerFn = fn;
      }
      return mockBlocker;
    });
  });

  it("calls useBlocker and blocks navigation when isDirty is true and path changes", () => {
    const { result } = renderHook(() => useUnsavedChangesWarning(true));

    expect(useBlocker).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(mockBlocker);
    expect(capturedBlockerFn).not.toBeNull();
    if (!capturedBlockerFn) throw new Error("capturedBlockerFn is null");

    const shouldBlock = capturedBlockerFn({
      currentLocation: { pathname: "/settings", search: "", hash: "", state: null, key: "c1" },
      nextLocation: { pathname: "/community", search: "", hash: "", state: null, key: "n1" },
      historyAction: NavigationType.Push,
    });

    expect(shouldBlock).toBe(true);
  });

  it("does not block navigation when isDirty is true but path remains identical (e.g. search param change)", () => {
    renderHook(() => useUnsavedChangesWarning(true));

    expect(capturedBlockerFn).not.toBeNull();
    if (!capturedBlockerFn) throw new Error("capturedBlockerFn is null");

    const shouldBlock = capturedBlockerFn({
      currentLocation: { pathname: "/settings", search: "?tab=1", hash: "", state: null, key: "c1" },
      nextLocation: { pathname: "/settings", search: "?tab=2", hash: "", state: null, key: "n1" },
      historyAction: NavigationType.Push,
    });

    expect(shouldBlock).toBe(false);
  });

  it("does not block navigation when isDirty is false", () => {
    renderHook(() => useUnsavedChangesWarning(false));

    expect(capturedBlockerFn).not.toBeNull();
    if (!capturedBlockerFn) throw new Error("capturedBlockerFn is null");

    const shouldBlock = capturedBlockerFn({
      currentLocation: { pathname: "/settings", search: "", hash: "", state: null, key: "c1" },
      nextLocation: { pathname: "/friends", search: "", hash: "", state: null, key: "n1" },
      historyAction: NavigationType.Push,
    });

    expect(shouldBlock).toBe(false);
  });

  it("attaches beforeunload listener and sets returnValue on event when isDirty is true", () => {
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = renderHook(() => useUnsavedChangesWarning(true));

    expect(addEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));

    const event = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    window.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(true);

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("does not prevent default on beforeunload when isDirty is false", () => {
    renderHook(() => useUnsavedChangesWarning(false));

    const event = new Event("beforeunload") as BeforeUnloadEvent;
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    window.dispatchEvent(event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });
});
