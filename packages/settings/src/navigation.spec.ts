import { describe, expect, it } from "vitest";
import { navigation } from "./navigation";

describe("settings navigation", () => {
  it("returns empty array because root settings route has hideInNav: true", () => {
    expect(navigation).toBeDefined();
    expect(Array.isArray(navigation)).toBe(true);
    expect(navigation).toHaveLength(0);
  });
});
