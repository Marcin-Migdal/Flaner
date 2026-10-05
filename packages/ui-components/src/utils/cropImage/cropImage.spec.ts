import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCroppedImg } from "./cropImage";

describe("cropImage util", () => {
  beforeEach(() => {
    // Mock Image
    vi.stubGlobal(
      "Image",
      class {
        naturalWidth = 200;
        naturalHeight = 200;
        src = "";
        crossOrigin = "";
        listeners: Record<string, () => void> = {};
        addEventListener(event: string, cb: () => void) {
          this.listeners[event] = cb;
          if (event === "load") {
            setTimeout(cb, 0);
          }
        }
        setAttribute(k: string, v: string) {
          if (k === "crossOrigin") this.crossOrigin = v;
        }
      }
    );

    // Mock Canvas context
    const mockCtx = {
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      drawImage: vi.fn(),
    };

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      mockCtx as unknown as CanvasRenderingContext2D
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
      this: HTMLCanvasElement,
      callback: BlobCallback,
      type?: string
    ) {
      const mockBlob = new Blob(["mock-image-data"], { type: type || "image/webp" });
      callback(mockBlob);
    });
  });

  it("crops image and returns File with default options", async () => {
    const file = await getCroppedImg("data:image/png;base64,123", {
      x: 10,
      y: 10,
      width: 100,
      height: 100,
    });

    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("avatar.webp");
    expect(file.type).toBe("image/webp");
  });

  it("handles rotation, flip, and custom output size options", async () => {
    const file = await getCroppedImg(
      "https://example.com/photo.jpg",
      { x: 0, y: 0, width: 80, height: 80 },
      {
        rotation: 90,
        flip: { horizontal: true, vertical: false },
        fileName: "custom.jpg",
        mimeType: "image/jpeg",
        outputSize: { width: 120, height: 120 },
      }
    );

    expect(file.name).toBe("custom.jpg");
    expect(file.type).toBe("image/jpeg");
  });

  it("rejects if image loading fails", async () => {
    vi.stubGlobal(
      "Image",
      class {
        addEventListener(event: string, cb: (e?: unknown) => void) {
          if (event === "error") {
            setTimeout(() => cb(new Error("Image error")), 0);
          }
        }
        setAttribute() {}
      }
    );

    await expect(
      getCroppedImg("invalid-url", { x: 0, y: 0, width: 10, height: 10 })
    ).rejects.toThrow("Image error");
  });

  it("throws error if canvas getContext('2d') returns null", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    await expect(
      getCroppedImg("data:image/png;base64,123", { x: 0, y: 0, width: 10, height: 10 })
    ).rejects.toThrow("Unable to create canvas context");
  });

  it("throws error if croppedCanvas getContext('2d') returns null", async () => {
    let callCount = 0;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          translate: vi.fn(),
          rotate: vi.fn(),
          scale: vi.fn(),
          drawImage: vi.fn(),
        } as unknown as CanvasRenderingContext2D;
      }
      return null;
    });

    await expect(
      getCroppedImg("data:image/png;base64,123", { x: 0, y: 0, width: 10, height: 10 })
    ).rejects.toThrow("Unable to create cropped canvas context");
  });

  it("rejects if toBlob produces null blob", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb: BlobCallback) => {
      cb(null);
    });

    await expect(
      getCroppedImg("data:image/png;base64,123", { x: 0, y: 0, width: 10, height: 10 })
    ).rejects.toThrow("Canvas export produced an empty blob");
  });
});
