import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTemplateCustomColors } from "./useTemplateCustomColors";
import { CUSTOM_COLOR_HEX_STORAGE_KEY } from "../../TemplateFormModal/TemplateFormModal.constants";

describe("useTemplateCustomColors", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("derives customHexMap from userTemplates and lookupColors", () => {
    const { result } = renderHook(() =>
      useTemplateCustomColors({
        userTemplates: [
          {
            id: "1",
            userId: "u1",
            material: "PLA",
            type: "Basic",
            colorName: "Ruby Red",
            colorHex: "#e0115f",
            defaultWeight: 1000,
          },
        ],
        lookupColors: [{ name: "Emerald Green", hex: "#50c878" }],
        isCustomColor: false,
        onColorHexChange: vi.fn(),
      })
    );

    expect(result.current.customHexMap["ruby red"]).toBe("#e0115f");
    expect(result.current.customHexMap["emerald green"]).toBe("#50c878");
  });

  it("saves valid hex and invokes onColorHexChange and onSaveLookupColor when isCustomColor is true", () => {
    const onColorHexChange = vi.fn();
    const onSaveLookupColor = vi.fn();

    const { result } = renderHook(() =>
      useTemplateCustomColors({
        userTemplates: [],
        lookupColors: [],
        isCustomColor: true,
        watchMaterial: "PLA",
        watchType: "Tough",
        watchColorName: "Custom Blue",
        onColorHexChange,
        onSaveLookupColor,
      })
    );

    act(() => {
      result.current.saveCustomColorHex("0000ff");
    });

    expect(onColorHexChange).toHaveBeenCalledWith("#0000ff");
    expect(onSaveLookupColor).toHaveBeenCalledWith({
      materialName: "PLA",
      typeName: "Tough",
      name: "Custom Blue",
      hex: "#0000ff",
    });
    expect(result.current.customHexMap["custom blue"]).toBe("#0000ff");
  });

  it("ignores invalid hex values", () => {
    const onColorHexChange = vi.fn();

    const { result } = renderHook(() =>
      useTemplateCustomColors({
        userTemplates: [],
        lookupColors: [],
        isCustomColor: false,
        onColorHexChange,
      })
    );

    act(() => {
      result.current.saveCustomColorHex("not-a-hex");
    });

    expect(onColorHexChange).not.toHaveBeenCalled();
  });

  it("handles valid and corrupted JSON in localStorage upon initialization", () => {
    localStorage.setItem(CUSTOM_COLOR_HEX_STORAGE_KEY, JSON.stringify({ "neon yellow": "#ffff00" }));

    const { result } = renderHook(() =>
      useTemplateCustomColors({
        userTemplates: [],
        lookupColors: [],
        isCustomColor: false,
        onColorHexChange: vi.fn(),
      })
    );

    expect(result.current.customHexMap["neon yellow"]).toBe("#ffff00");

    // Corrupted JSON triggers catch block gracefully
    localStorage.setItem(CUSTOM_COLOR_HEX_STORAGE_KEY, "{invalid-json");
    const { result: corruptResult } = renderHook(() =>
      useTemplateCustomColors({
        userTemplates: [],
        lookupColors: [],
        isCustomColor: false,
        onColorHexChange: vi.fn(),
      })
    );
    expect(corruptResult.current.customHexMap).toBeDefined();
  });

  it("handles empty or whitespace-only hex input and hex already prefixed with #", () => {
    const onColorHexChange = vi.fn();
    const { result } = renderHook(() =>
      useTemplateCustomColors({
        userTemplates: [],
        lookupColors: [],
        isCustomColor: false,
        onColorHexChange,
      })
    );

    act(() => {
      result.current.saveCustomColorHex("   ");
    });
    expect(onColorHexChange).not.toHaveBeenCalled();

    act(() => {
      result.current.saveCustomColorHex("#aabbcc");
    });
    expect(onColorHexChange).toHaveBeenCalledWith("#aabbcc");
  });

  it("handles saving custom color without onSaveLookupColor callback or missing form fields", () => {
    const onColorHexChange = vi.fn();
    const { result } = renderHook(() =>
      useTemplateCustomColors({
        userTemplates: [],
        lookupColors: [],
        isCustomColor: true,
        watchMaterial: "PLA",
        // watchType and watchColorName omitted
        onColorHexChange,
      })
    );

    act(() => {
      result.current.saveCustomColorHex("#112233");
    });
    expect(onColorHexChange).toHaveBeenCalledWith("#112233");

    // With watch fields present but no onSaveLookupColor callback
    const { result: result2 } = renderHook(() =>
      useTemplateCustomColors({
        userTemplates: [],
        lookupColors: [],
        isCustomColor: true,
        watchMaterial: "PLA",
        watchType: "Basic",
        watchColorName: "Custom Red",
        onColorHexChange,
      })
    );

    act(() => {
      result2.current.saveCustomColorHex("#ff1122");
    });
    expect(onColorHexChange).toHaveBeenCalledWith("#ff1122");
  });

  it("handles storage write error in storeCustomColorHex gracefully", () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    const onColorHexChange = vi.fn();
    const { result } = renderHook(() =>
      useTemplateCustomColors({
        userTemplates: [],
        lookupColors: [],
        isCustomColor: true,
        watchMaterial: "PLA",
        watchType: "Basic",
        watchColorName: "Custom Red",
        onColorHexChange,
      })
    );

    expect(() => {
      act(() => {
        result.current.saveCustomColorHex("#ff1122");
      });
    }).not.toThrow();

    setItemSpy.mockRestore();
  });
});
