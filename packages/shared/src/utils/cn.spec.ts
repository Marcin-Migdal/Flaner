import { describe, it, expect } from "vitest";
import { cn } from "./cn";

describe("cn utility", () => {
  it("merges class names and handles falsy values", () => {
    const isHidden = false;
    expect(cn("px-2", isHidden && "py-2", null, undefined, "text-sm")).toBe("px-2 text-sm");
  });

  it("resolves tailwind conflicts using tailwind-merge", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles object conditionals", () => {
    expect(cn("base", { active: true, hidden: false })).toBe("base active");
  });
});
