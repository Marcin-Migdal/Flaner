import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createMockUser } from "@flaner/test-utils";
import * as lookupsApi from "../../../../../api/lookups";
import { useSyncLookups } from "./useSyncLookups";
import type { FilamentTemplate } from "../../../../../api/templates";

vi.mock("../../../../../api/lookups", () => ({
  addLookupColor: vi.fn(),
  addLookupMaterial: vi.fn(),
  addLookupType: vi.fn(),
}));

describe("useSyncLookups", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when user is null", () => {
    renderHook(() => useSyncLookups(null, []));

    expect(lookupsApi.addLookupMaterial).not.toHaveBeenCalled();
    expect(lookupsApi.addLookupType).not.toHaveBeenCalled();
    expect(lookupsApi.addLookupColor).not.toHaveBeenCalled();
  });

  it("does nothing when user has only official Bambu templates", () => {
    const user = createMockUser({ uid: "user-1" });
    const officialTemplates: FilamentTemplate[] = [
      {
        id: "t1",
        userId: "user-1",
        material: "PLA",
        type: "Basic",
        colorName: "Black",
        colorHex: "#111111",
        defaultWeight: 1000,
      },
    ];

    renderHook(() => useSyncLookups(user, officialTemplates));

    expect(lookupsApi.addLookupMaterial).not.toHaveBeenCalled();
    expect(lookupsApi.addLookupType).not.toHaveBeenCalled();
    expect(lookupsApi.addLookupColor).not.toHaveBeenCalled();
  });

  it("syncs custom material, type, and color to Firestore lookups", async () => {
    const user = createMockUser({ uid: "user-1" });
    vi.mocked(lookupsApi.addLookupMaterial).mockResolvedValueOnce("m1");
    vi.mocked(lookupsApi.addLookupType).mockResolvedValueOnce("t1");
    vi.mocked(lookupsApi.addLookupColor).mockResolvedValueOnce("c1");

    const customTemplates: FilamentTemplate[] = [
      {
        id: "t2",
        userId: "user-1",
        material: "CustomWood",
        type: "Oak",
        colorName: "Dark Oak",
        colorHex: "#552200",
        defaultWeight: 1000,
      },
    ];

    renderHook(() => useSyncLookups(user, customTemplates));

    await waitFor(() => {
      expect(lookupsApi.addLookupMaterial).toHaveBeenCalledWith("user-1", { name: "CustomWood" });
      expect(lookupsApi.addLookupType).toHaveBeenCalledWith("user-1", { materialName: "CustomWood", name: "Oak" });
      expect(lookupsApi.addLookupColor).toHaveBeenCalledWith("user-1", {
        materialName: "CustomWood",
        typeName: "Oak",
        name: "Dark Oak",
        hex: "#552200",
      });
    });
  });

  it("skips templates with incomplete fields", () => {
    const user = createMockUser({ uid: "user-1" });
    const incompleteTemplates: FilamentTemplate[] = [
      {
        id: "t-inc",
        userId: "user-1",
        material: "",
        type: "Oak",
        colorName: "Dark Oak",
        colorHex: "#552200",
        defaultWeight: 1000,
      },
    ];

    renderHook(() => useSyncLookups(user, incompleteTemplates));

    expect(lookupsApi.addLookupMaterial).not.toHaveBeenCalled();
    expect(lookupsApi.addLookupType).not.toHaveBeenCalled();
    expect(lookupsApi.addLookupColor).not.toHaveBeenCalled();
  });

  it("handles rejected promises from allSettled and logs errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = createMockUser({ uid: "user-1" });
    vi.mocked(lookupsApi.addLookupMaterial).mockRejectedValueOnce(new Error("Fail sync"));

    const customTemplates: FilamentTemplate[] = [
      {
        id: "t2",
        userId: "user-1",
        material: "CustomMatFail",
        type: "T1",
        colorName: "C1",
        colorHex: "#111111",
        defaultWeight: 1000,
      },
    ];

    renderHook(() => useSyncLookups(user, customTemplates));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled();
    });
    errorSpy.mockRestore();
  });

  it("uses fallback #ffffff when colorHex is missing on custom template", async () => {
    const user = createMockUser({ uid: "user-1" });
    vi.mocked(lookupsApi.addLookupMaterial).mockResolvedValueOnce("m1");
    vi.mocked(lookupsApi.addLookupType).mockResolvedValueOnce("t1");
    vi.mocked(lookupsApi.addLookupColor).mockResolvedValueOnce("c1");

    const customTemplates: FilamentTemplate[] = [
      {
        id: "t-no-hex",
        userId: "user-1",
        material: "CustomMatHexless",
        type: "T1",
        colorName: "C1",
        colorHex: "",
        defaultWeight: 1000,
      },
    ];

    renderHook(() => useSyncLookups(user, customTemplates));

    await waitFor(() => {
      expect(lookupsApi.addLookupColor).toHaveBeenCalledWith("user-1", {
        materialName: "CustomMatHexless",
        typeName: "T1",
        name: "C1",
        hex: "#ffffff",
      });
    });
  });

  it("logs error when syncLookups encounters an unexpected thrown exception", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const user = createMockUser({ uid: "user-1" });
    const allSettledSpy = vi.spyOn(Promise, "allSettled").mockImplementationOnce(() => {
      throw new Error("Catastrophic error");
    });

    const customTemplates: FilamentTemplate[] = [
      {
        id: "t-thrown",
        userId: "user-1",
        material: "CustomMatThrow",
        type: "T1",
        colorName: "C1",
        colorHex: "#123456",
        defaultWeight: 1000,
      },
    ];

    renderHook(() => useSyncLookups(user, customTemplates));

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("Lookup sync failed:", expect.any(Error));
    });

    allSettledSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
