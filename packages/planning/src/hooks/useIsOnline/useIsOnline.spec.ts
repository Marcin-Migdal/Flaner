import { onlineManager } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useIsOnline } from "./useIsOnline";

describe("useIsOnline", () => {
  afterEach(() => onlineManager.setOnline(true));

  it("follows the connection", () => {
    const { result } = renderHook(() => useIsOnline());
    expect(result.current).toBe(true);

    act(() => onlineManager.setOnline(false));
    expect(result.current).toBe(false);

    act(() => onlineManager.setOnline(true));
    expect(result.current).toBe(true);
  });
});
