import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getValidatedCloudName,
  uploadToCloudinary,
  compressImage,
  FlanerUploadPreset,
} from "./cloudinary";

describe("cloudinary utility", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getValidatedCloudName", () => {
    it("returns cloud name when environment variable is present", () => {
      vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "my-test-cloud");
      expect(getValidatedCloudName()).toBe("my-test-cloud");
      vi.unstubAllEnvs();
    });

    it("throws an error when VITE_CLOUDINARY_CLOUD_NAME is missing", () => {
      vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "");
      expect(() => getValidatedCloudName()).toThrow(/Missing Cloudinary Cloud Name/i);
      vi.unstubAllEnvs();
    });
  });

  describe("uploadToCloudinary", () => {
    it("uploads a file successfully and returns secure_url", async () => {
      vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "my-cloud");

      const mockFile = new File(["test content"], "avatar.png", { type: "image/png" });
      const mockResponse = {
        ok: true,
        json: async () => ({ secure_url: "https://res.cloudinary.com/avatar.png" }),
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse as never);

      const url = await uploadToCloudinary(mockFile, FlanerUploadPreset.AVATARS);
      expect(url).toBe("https://res.cloudinary.com/avatar.png");
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.cloudinary.com/v1_1/my-cloud/image/upload",
        expect.objectContaining({ method: "POST" })
      );

      vi.unstubAllEnvs();
    });

    it("throws an error when upload response is not ok", async () => {
      vi.stubEnv("VITE_CLOUDINARY_CLOUD_NAME", "my-cloud");

      const mockFile = new File(["test"], "photo.jpg", { type: "image/jpeg" });
      const mockResponse = {
        ok: false,
        status: 400,
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse as never);

      await expect(uploadToCloudinary(mockFile)).rejects.toThrow(/Nie udało się przesłać pliku/);
      vi.unstubAllEnvs();
    });
  });

  describe("compressImage", () => {
    it("rejects when sizeLimit is less than or equal to 0", async () => {
      const mockFile = new File(["data"], "test.png", { type: "image/png" });
      await expect(compressImage(mockFile, 0)).rejects.toThrow(/Nieprawidłowy limit rozmiaru/);
      await expect(compressImage(mockFile, -100)).rejects.toThrow(/Nieprawidłowy limit rozmiaru/);
    });

    it("handles image load failure during compression", async () => {
      const mockFile = new File(["dummy image"], "broken.png", { type: "image/png" });

      // Simulate Image.onerror trigger
      const originalImage = window.Image;
      class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        width = 100;
        height = 100;
        set src(_val: string) {
          setTimeout(() => this.onerror?.(), 10);
        }
      }
      window.Image = MockImage as unknown as typeof Image;

      await expect(compressImage(mockFile, 1024 * 1024)).rejects.toThrow(
        /Nie udało się załadować obrazu/
      );

      window.Image = originalImage;
    });

    it("compresses image when canvas context and blob conversion succeed", async () => {
      const mockFile = new File(["dummy image"], "photo.png", { type: "image/png" });
      const mockBlob = new Blob(["compressed data"], { type: "image/webp" });

      const originalImage = window.Image;
      class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        width = 200;
        height = 200;
        set src(_val: string) {
          setTimeout(() => this.onload?.(), 10);
        }
      }
      window.Image = MockImage as unknown as typeof Image;

      const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
        drawImage: vi.fn(),
      } as never);

      const toBlobSpy = vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((cb) => {
        cb(mockBlob);
      });

      const compressed = await compressImage(mockFile, 1024 * 1024);
      expect(compressed).toBeInstanceOf(File);
      expect(compressed.type).toBe("image/webp");

      getContextSpy.mockRestore();
      toBlobSpy.mockRestore();
      window.Image = originalImage;
    });
  });
});
