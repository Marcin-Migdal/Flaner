import { MFE_NAMES } from "@flaner/shared/constants";
import { describe, expect, it } from "vitest";
import { getMfeUrl, MFE_REGISTRY } from "./mfeRegistry";

describe("MFE_REGISTRY", () => {
  it("lists every MFE once, in MFE_NAMES order", () => {
    expect(MFE_REGISTRY.map((mfe) => mfe.name)).toEqual(Object.values(MFE_NAMES));
  });

  it("falls back to the local dev ports without VITE_MFE_*_URL", () => {
    const host = window.location.hostname;
    expect(MFE_REGISTRY.map((mfe) => mfe.url)).toEqual([
      `http://${host}:4201`,
      `http://${host}:4202`,
      `http://${host}:4203`,
      `http://${host}:4204`,
      `http://${host}:4205`,
    ]);
  });

  it("keeps the current mounting: community via ./routes, the rest via ./App; settings has no tiles page", () => {
    expect(MFE_REGISTRY.filter((mfe) => mfe.mount === "routes").map((mfe) => mfe.name)).toEqual(["community"]);
    expect(MFE_REGISTRY.filter((mfe) => !mfe.tiles).map((mfe) => mfe.name)).toEqual(["settings"]);
  });
});

describe("getMfeUrl", () => {
  it("returns the MFE URL for an MFE namespace and undefined for a host one", () => {
    expect(getMfeUrl("planning")).toBe(`http://${window.location.hostname}:4204`);
    expect(getMfeUrl("common")).toBeUndefined();
  });
});
