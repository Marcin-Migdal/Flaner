import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImagePicker } from "./ImagePicker";
import React from "react";

vi.mock("../../hooks/useUiTranslations", () => ({
  useUiTranslations: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        "imagePicker.dropzoneIdleText": "Click or drag image to upload",
        "imagePicker.dropzoneActiveText": "Drop image here",
        "imagePicker.acceptedFormatsDesc": "PNG, JPG up to 5MB",
        "imagePicker.noImageSelectedTitle": "No image selected",
        "imagePicker.noImageSelectedDesc": "Please choose a photo",
        "imagePicker.cloudImageDesc": "Cloud hosted image",
        "imagePicker.invalidFileType": "Invalid file type",
        "imagePicker.fileTooSmall": `File is too small (min ${params?.size})`,
        "imagePicker.fileTooLarge": `File is too large (max ${params?.size})`,
        "imagePicker.resolutionTooSmall": `Resolution too small (min ${params?.res})`,
        "imagePicker.resolutionTooLarge": `Resolution too large (max ${params?.res})`,
        "imagePicker.dimensionReadError": "Could not read dimensions",
        "imagePicker.fileLoadError": "Error loading file",
        "imagePicker.networkImageDefaultName": "Network Image",
        "imagePicker.compressing": "Compressing image...",
        "imagePicker.editCropTooltip": "Edit crop",
        "imagePicker.externalAvatarCropDisabledTooltip": "Crop disabled for external image",
      };
      return translations[key] ?? key;
    },
  }),
}));

vi.mock("../ImageCropperModal", () => ({
  ImageCropperModal: ({
    open,
    onOpenChange,
    onCropComplete,
    onCancel,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCropComplete: (f: File) => void;
    onCancel?: () => void;
  }) =>
    open ? (
      <div data-testid="mock-cropper-modal">
        <button
          type="button"
          data-testid="complete-crop-btn"
          onClick={() => {
            onCropComplete(new File(["cropped-img"], "cropped.webp", { type: "image/webp" }));
            onOpenChange(false);
          }}
        >
          Complete Crop
        </button>
        <button
          type="button"
          data-testid="complete-crop-invalid-btn"
          onClick={() => {
            onCropComplete(new File(["pdf"], "doc.pdf", { type: "application/pdf" }));
            onOpenChange(false);
          }}
        >
          Complete Crop Invalid
        </button>
        <button
          type="button"
          data-testid="cancel-crop-btn"
          onClick={() => {
            onCancel?.();
            onOpenChange(false);
          }}
        >
          Cancel Crop
        </button>
      </div>
    ) : null,
}));

describe("ImagePicker component", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.URL.createObjectURL = vi.fn((file: unknown) => {
      const name = file instanceof File ? file.name : "mock";
      return `blob:http://localhost/${name}`;
    });
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it("renders empty state dropzone when no value is provided", () => {
    render(
      <ImagePicker
        label="Avatar photo"
        description="Upload square photo"
      />
    );

    expect(screen.getByText("Avatar photo")).toBeInTheDocument();
    expect(screen.getByText("Click or drag image to upload")).toBeInTheDocument();
    expect(screen.getByText("Upload square photo")).toBeInTheDocument();
    expect(screen.getByText("No image selected")).toBeInTheDocument();
  });

  it("renders image preview when URL string is passed as value (Cloudinary vs external)", () => {
    const { rerender } = render(
      <ImagePicker
        label="Cover Image"
        value="https://res.cloudinary.com/demo/image/upload/sample.jpg"
        enableCrop={true}
      />
    );

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://res.cloudinary.com/demo/image/upload/sample.jpg");
    expect(screen.getByText("sample.jpg")).toBeInTheDocument();

    // Crop button should be enabled for Cloudinary
    const cropBtn = screen.getAllByRole("button")[0];
    expect(cropBtn).toHaveAttribute("aria-disabled", "false");

    // External image
    rerender(
      <ImagePicker
        label="Cover Image"
        value="https://external.com/avatar.jpg"
        enableCrop={true}
      />
    );
    const externalCropBtn = screen.getAllByRole("button")[0];
    expect(externalCropBtn).toHaveAttribute("aria-disabled", "true");
  });

  it("renders File object preview with formatted size and file name", () => {
    const file = new File(["dummy content here"], "my-photo.png", { type: "image/png" });
    Object.defineProperty(file, "size", { value: 1500000 }); // 1.5 MB

    render(<ImagePicker label="Profile" value={file} />);

    expect(screen.getByText("my-photo.png")).toBeInTheDocument();
    expect(screen.getByText("1.4 MB")).toBeInTheDocument();
  });

  it("calls onChange with null when remove button is clicked", async () => {
    const user = userEvent.setup();
    const onChangeMock = vi.fn();

    render(
      <ImagePicker
        label="Cover Image"
        value="https://res.cloudinary.com/demo/image/upload/sample.jpg"
        onChange={onChangeMock}
      />
    );

    const buttons = screen.getAllByRole("button");
    const deleteBtn = buttons[0];
    await user.click(deleteBtn);

    expect(onChangeMock).toHaveBeenCalledWith(null);
  });

  it("renders external error message", () => {
    render(
      <ImagePicker
        label="Photo"
        error="File size exceeds maximum allowed"
      />
    );

    expect(screen.getByText("File size exceeds maximum allowed")).toBeInTheDocument();
  });

  it("validates file type and displays error for non-image files", () => {
    const onChangeMock = vi.fn();
    const { container } = render(<ImagePicker onChange={onChangeMock} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const txtFile = new File(["hello text"], "doc.txt", { type: "text/plain" });

    fireEvent.change(input, { target: { files: [txtFile] } });

    expect(screen.getByText("Invalid file type")).toBeInTheDocument();
    expect(onChangeMock).not.toHaveBeenCalled();
  });

  it("validates minSize and displays error when file is too small", () => {
    const onChangeMock = vi.fn();
    const { container } = render(
      <ImagePicker onChange={onChangeMock} minSize={5000} />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const tinyFile = new File(["tiny"], "tiny.png", { type: "image/png" });
    Object.defineProperty(tinyFile, "size", { value: 100 });

    fireEvent.change(input, { target: { files: [tinyFile] } });

    expect(screen.getByText(/File is too small/)).toBeInTheDocument();
    expect(onChangeMock).not.toHaveBeenCalled();
  });

  it("handles drag over, drag leave, and drop events", () => {
    const onChangeMock = vi.fn();
    render(<ImagePicker onChange={onChangeMock} />);

    const dropzone = screen.getByRole("button", { name: /upload/i });

    // Drag over
    fireEvent.dragOver(dropzone);
    expect(screen.getByText("Drop image here")).toBeInTheDocument();

    // Drag leave
    fireEvent.dragLeave(dropzone);
    expect(screen.getByText("Click or drag image to upload")).toBeInTheDocument();

    // Drop invalid file
    const txtFile = new File(["test"], "test.pdf", { type: "application/pdf" });
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [txtFile] },
    });
    expect(screen.getByText("Invalid file type")).toBeInTheDocument();

    // Drop valid image
    const validFile = new File(["img"], "pic.png", { type: "image/png" });
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [validFile] },
    });
    expect(onChangeMock).toHaveBeenCalledWith(validFile);
  });

  it("triggers file input on click and keyboard (Enter and Space) on dropzone", () => {
    const { container } = render(<ImagePicker />);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click");

    const dropzone = screen.getByRole("button", { name: /upload/i });
    fireEvent.click(dropzone);
    expect(clickSpy).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(dropzone, { key: "Enter" });
    expect(clickSpy).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(dropzone, { key: " " });
    expect(clickSpy).toHaveBeenCalledTimes(3);

    fireEvent.keyDown(dropzone, { key: "ArrowDown" });
    expect(clickSpy).toHaveBeenCalledTimes(3);
  });

  it("supports ref forwarding with object ref and function ref", () => {
    const objRef = React.createRef<HTMLInputElement>();
    const funcRef = vi.fn();

    const { rerender } = render(<ImagePicker ref={objRef} />);
    expect(objRef.current).toBeInstanceOf(HTMLInputElement);

    rerender(<ImagePicker ref={funcRef} />);
    expect(funcRef).toHaveBeenCalledWith(expect.any(HTMLInputElement));
  });

  it("handles cropping flow when enableCrop or cropShape is set", async () => {
    const user = userEvent.setup();
    const onChangeMock = vi.fn();
    const { container } = render(
      <ImagePicker
        cropShape="round"
        onChange={onChangeMock}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["raw-photo"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });

    // Cropper modal should open
    expect(screen.getByTestId("mock-cropper-modal")).toBeInTheDocument();

    // Cancel cropping
    const cancelBtn = screen.getByTestId("cancel-crop-btn");
    await user.click(cancelBtn);
    expect(screen.queryByTestId("mock-cropper-modal")).not.toBeInTheDocument();
    expect(onChangeMock).not.toHaveBeenCalled();

    // Re-select and complete crop
    fireEvent.change(input, { target: { files: [file] } });
    const completeBtn = screen.getByTestId("complete-crop-btn");
    await user.click(completeBtn);

    expect(onChangeMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "cropped.webp", type: "image/webp" })
    );
  });

  it("opens cropper for existing editable Cloudinary image", async () => {
    const user = userEvent.setup();
    render(
      <ImagePicker
        enableCrop={true}
        value="https://res.cloudinary.com/test/image/upload/sample.jpg"
      />
    );

    const cropBtn = screen.getAllByRole("button")[0];
    await user.click(cropBtn);

    expect(screen.getByTestId("mock-cropper-modal")).toBeInTheDocument();
  });

  it("checks resolution restrictions (minResolution and maxResolution)", async () => {
    // Mock FileReader and Image
    const originalFileReader = globalThis.FileReader;
    const originalImage = globalThis.Image;

    let imgNaturalWidth = 500;
    let imgNaturalHeight = 500;
    let imgShouldError = false;
    let readerShouldError = false;

    class TestFileReader {
      onload?: (e: { target: { result: string } }) => void;
      onerror?: () => void;
      readAsDataURL() {
        if (readerShouldError) {
          setTimeout(() => this.onerror?.(), 0);
        } else {
          setTimeout(() => this.onload?.({ target: { result: "data:image/png;base64,123" } }), 0);
        }
      }
    }

    class TestImage {
      onload?: () => void;
      onerror?: () => void;
      get naturalWidth() {
        return imgNaturalWidth;
      }
      get naturalHeight() {
        return imgNaturalHeight;
      }
      set src(_val: string) {
        if (imgShouldError) {
          setTimeout(() => this.onerror?.(), 0);
        } else {
          setTimeout(() => this.onload?.(), 0);
        }
      }
    }

    vi.stubGlobal("FileReader", TestFileReader);
    vi.stubGlobal("Image", TestImage);

    try {
      const onChangeMock = vi.fn();
      const { container } = render(
        <ImagePicker
          onChange={onChangeMock}
          minResolution={{ width: 400, height: 400 }}
          maxResolution={{ width: 800, height: 800 }}
        />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["img"], "pic.png", { type: "image/png" });

      // 1. Resolution within range -> succeeds
      fireEvent.change(input, { target: { files: [file] } });
      await waitFor(() => {
        expect(onChangeMock).toHaveBeenCalledWith(file);
      });

      // 2. Resolution too small
      imgNaturalWidth = 200;
      imgNaturalHeight = 200;
      fireEvent.change(input, { target: { files: [file] } });
      await waitFor(() => {
        expect(screen.getByText(/Resolution too small/)).toBeInTheDocument();
      });

      // 3. Resolution too large
      imgNaturalWidth = 1200;
      imgNaturalHeight = 1200;
      fireEvent.change(input, { target: { files: [file] } });
      await waitFor(() => {
        expect(screen.getByText(/Resolution too large/)).toBeInTheDocument();
      });

      // 4. Image decode error
      imgShouldError = true;
      fireEvent.change(input, { target: { files: [file] } });
      await waitFor(() => {
        expect(screen.getByText("Could not read dimensions")).toBeInTheDocument();
      });

      // 5. File read error
      imgShouldError = false;
      readerShouldError = true;
      fireEvent.change(input, { target: { files: [file] } });
      await waitFor(() => {
        expect(screen.getByText("Error loading file")).toBeInTheDocument();
      });
    } finally {
      globalThis.FileReader = originalFileReader;
      globalThis.Image = originalImage;
    }
  });

  it("handles image compression when file exceeds maxSize", async () => {
    // Mock canvas context and image for compressImageToSize
    const originalImage = globalThis.Image;

    class CompImage {
      naturalWidth = 1000;
      naturalHeight = 1000;
      onload?: () => void;
      onerror?: () => void;
      set src(_val: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    vi.stubGlobal("Image", CompImage);

    const mockCtx = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      mockCtx as unknown as CanvasRenderingContext2D
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
      this: HTMLCanvasElement,
      cb: BlobCallback,
      type?: string
    ) {
      // Returns a small blob that satisfies maxSize
      const smallBlob = new Blob(["compressed"], { type: type || "image/webp" });
      Object.defineProperty(smallBlob, "size", { value: 50 });
      cb(smallBlob);
    });

    try {
      const onChangeMock = vi.fn();
      const { container } = render(
        <ImagePicker
          onChange={onChangeMock}
          maxSize={100}
        />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const bigFile = new File(["large payload"], "big.png", { type: "image/png" });
      Object.defineProperty(bigFile, "size", { value: 500 });

      fireEvent.change(input, { target: { files: [bigFile] } });

      await waitFor(() => {
        expect(onChangeMock).toHaveBeenCalledWith(
          expect.objectContaining({ type: "image/webp" })
        );
      });
    } finally {
      globalThis.Image = originalImage;
    }
  });

  it("handles compression failure when file still exceeds maxSize", async () => {
    const originalImage = globalThis.Image;

    class CompImage {
      naturalWidth = 1000;
      naturalHeight = 1000;
      onload?: () => void;
      onerror?: () => void;
      set src(_val: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    vi.stubGlobal("Image", CompImage);

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    try {
      const onChangeMock = vi.fn();
      const { container } = render(
        <ImagePicker
          onChange={onChangeMock}
          maxSize={100}
        />
      );

      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      const bigFile = new File(["large payload"], "big.jpg", { type: "image/jpeg" });
      Object.defineProperty(bigFile, "size", { value: 500 });

      fireEvent.change(input, { target: { files: [bigFile] } });

      await waitFor(() => {
        expect(screen.getByText(/File is too large/)).toBeInTheDocument();
      });
      expect(onChangeMock).not.toHaveBeenCalled();
    } finally {
      globalThis.Image = originalImage;
    }
  });

  it("handles blob URL or data URL as editable internal image", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ImagePicker
        enableCrop={true}
        value="blob:http://localhost/test.jpg"
      />
    );

    let cropBtn = screen.getAllByRole("button")[0];
    expect(cropBtn).toHaveAttribute("aria-disabled", "false");
    await user.click(cropBtn);
    expect(screen.getByTestId("mock-cropper-modal")).toBeInTheDocument();

    rerender(
      <ImagePicker
        enableCrop={true}
        value="data:image/jpeg;base64,123"
      />
    );
    cropBtn = screen.getAllByRole("button")[0];
    expect(cropBtn).toHaveAttribute("aria-disabled", "false");
  });

  it("displays invalidFileType when cropped output is unexpectedly not an image", async () => {
    const user = userEvent.setup();
    const onChangeMock = vi.fn();
    const { container } = render(
      <ImagePicker
        cropShape="round"
        onChange={onChangeMock}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["raw-photo"], "photo.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByTestId("mock-cropper-modal")).toBeInTheDocument();

    const invalidCropBtn = screen.getByTestId("complete-crop-invalid-btn");
    await user.click(invalidCropBtn);

    expect(screen.getByText("Invalid file type")).toBeInTheDocument();
    expect(onChangeMock).not.toHaveBeenCalled();
  });

  it("handles compression branches: already small file, scale iterations, null blob, and image error", async () => {
    let shouldError = false;
    class BranchCompImage {
      naturalWidth = 1000;
      naturalHeight = 1000;
      onload?: () => void;
      onerror?: () => void;
      set src(_val: string) {
        if (shouldError) {
          setTimeout(() => this.onerror?.(), 0);
        } else {
          setTimeout(() => this.onload?.(), 0);
        }
      }
    }
    vi.stubGlobal("Image", BranchCompImage);

    // 1. File already <= maxSize
    const onChangeMock = vi.fn();
    const { container } = render(
      <ImagePicker
        onChange={onChangeMock}
        maxSize={1000}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const smallFile = new File(["small"], "small.png", { type: "image/png" });
    Object.defineProperty(smallFile, "size", { value: 500 });
    fireEvent.change(input, { target: { files: [smallFile] } });

    await waitFor(() => {
      expect(onChangeMock).toHaveBeenCalledWith(smallFile);
    });

    // 2. Image error in compression
    shouldError = true;
    const errorFile = new File(["error"], "err.png", { type: "image/png" });
    Object.defineProperty(errorFile, "size", { value: 5000 });
    fireEvent.change(input, { target: { files: [errorFile] } });

    await waitFor(() => {
      expect(onChangeMock).toHaveBeenCalledWith(errorFile);
    });

    // 3. Canvas scale iterations and null blob
    shouldError = false;
    let callIdx = 0;
    const mockCtx = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      mockCtx as unknown as CanvasRenderingContext2D
    );
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
      this: HTMLCanvasElement,
      cb: BlobCallback
    ) {
      callIdx++;
      if (callIdx === 1) {
        cb(null); // null blob branch
      } else {
        const b = new Blob(["blob"]);
        Object.defineProperty(b, "size", { value: 2000 }); // larger than maxSize (1000)
        cb(b);
      }
    });

    const bigFile = new File(["big"], "big.png", { type: "image/png" });
    Object.defineProperty(bigFile, "size", { value: 5000 });
    fireEvent.change(input, { target: { files: [bigFile] } });

    await waitFor(() => {
      expect(screen.getByText(/File is too large/)).toBeInTheDocument();
    });
  });
});

