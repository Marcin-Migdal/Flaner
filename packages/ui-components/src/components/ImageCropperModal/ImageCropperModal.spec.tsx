import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "@flaner/shared/utils";
import * as cropUtil from "../../utils/cropImage";
import { ImageCropperModal } from "./ImageCropperModal";

vi.mock("react-easy-crop", () => ({
  default: ({
    onCropComplete,
    onRotationChange,
    onZoomChange,
    onCropChange,
  }: {
    onCropComplete?: (croppedArea: unknown, croppedAreaPixels: unknown) => void;
    onRotationChange?: (rot: number) => void;
    onZoomChange?: (zoom: number) => void;
    onCropChange?: (crop: { x: number; y: number }) => void;
  }) => (
    <div data-testid="mock-cropper">
      <span>Cropper Area</span>
      <button
        type="button"
        data-testid="simulate-crop"
        onClick={() => {
          onCropComplete?.({ x: 0, y: 0, width: 100, height: 100 }, { x: 10, y: 10, width: 200, height: 200 });
          onRotationChange?.(90);
          onZoomChange?.(1.5);
          onCropChange?.({ x: 5, y: 5 });
        }}
      >
        Trigger Crop
      </button>
    </div>
  ),
}));

describe("ImageCropperModal component", () => {
  it("renders cropper modal when open is true", () => {
    render(
      <ImageCropperModal
        open={true}
        onOpenChange={vi.fn()}
        imageSrc="https://example.com/photo.jpg"
        onCropComplete={vi.fn()}
        labels={{
          title: "Adjust Photo",
          apply: "Save Crop",
          cancel: "Discard",
        }}
      />
    );

    expect(screen.getByText("Adjust Photo")).toBeInTheDocument();
    expect(screen.getByTestId("mock-cropper")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Crop" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
  });

  it("calls onCancel when discard/cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancelMock = vi.fn();
    const onOpenChangeMock = vi.fn();

    render(
      <ImageCropperModal
        open={true}
        onOpenChange={onOpenChangeMock}
        imageSrc="https://example.com/photo.jpg"
        onCropComplete={vi.fn()}
        onCancel={onCancelMock}
        labels={{
          cancel: "Cancel Edit",
        }}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: "Cancel Edit" });
    await user.click(cancelBtn);

    expect(onCancelMock).toHaveBeenCalledTimes(1);
    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
  });

  it("handles zoom change, rotate button, crop trigger and successful apply", async () => {
    const user = userEvent.setup();
    const onCropCompleteMock = vi.fn();
    const onOpenChangeMock = vi.fn();
    const mockFile = new File(["cropped"], "cropped.webp", { type: "image/webp" });
    vi.spyOn(cropUtil, "getCroppedImg").mockResolvedValueOnce(mockFile);

    render(
      <ImageCropperModal
        open={true}
        onOpenChange={onOpenChangeMock}
        imageSrc="https://example.com/photo.jpg"
        onCropComplete={onCropCompleteMock}
        cropShape="rect"
      />
    );

    // Zoom slider
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "2" } });
    expect(slider).toHaveValue("2");

    // Rotate button
    const rotateBtn = screen.getByRole("button", { name: "imageCropper.rotate" });
    await user.click(rotateBtn);

    // Trigger crop completion
    const triggerCropBtn = screen.getByTestId("simulate-crop");
    await user.click(triggerCropBtn);

    // Apply button should now be enabled
    const applyBtn = screen.getByRole("button", { name: "imageCropper.apply" });
    expect(applyBtn).not.toBeDisabled();
    await user.click(applyBtn);

    await waitFor(() => {
      expect(onCropCompleteMock).toHaveBeenCalledWith(mockFile);
      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    });
  });

  it("handles error during image crop apply and displays toast failure", async () => {
    const user = userEvent.setup();
    const toastSpy = vi.spyOn(toast, "failure").mockImplementation(() => {});
    vi.spyOn(cropUtil, "getCroppedImg").mockRejectedValueOnce(new Error("Crop failed"));

    render(
      <ImageCropperModal
        open={true}
        onOpenChange={vi.fn()}
        imageSrc="https://example.com/photo.jpg"
        onCropComplete={vi.fn()}
        labels={{
          cropError: "Custom crop failed message",
        }}
      />
    );

    // Trigger crop completion
    const triggerCropBtn = screen.getByTestId("simulate-crop");
    await user.click(triggerCropBtn);

    const applyBtn = screen.getByRole("button", { name: "imageCropper.apply" });
    await user.click(applyBtn);

    await waitFor(() => {
      expect(toastSpy).toHaveBeenCalledWith("Custom crop failed message");
    });
  });

  it("does not render dialog content when open is false or imageSrc is null", () => {
    const { rerender } = render(
      <ImageCropperModal
        open={false}
        onOpenChange={vi.fn()}
        imageSrc="https://example.com/photo.jpg"
        onCropComplete={vi.fn()}
      />
    );

    expect(screen.queryByTestId("mock-cropper")).not.toBeInTheDocument();

    rerender(
      <ImageCropperModal
        open={true}
        onOpenChange={vi.fn()}
        imageSrc={null}
        onCropComplete={vi.fn()}
      />
    );

    expect(screen.queryByTestId("mock-cropper")).not.toBeInTheDocument();
  });

  it("does not apply crop when croppedAreaPixels is null", () => {
    const onCropCompleteMock = vi.fn();
    render(
      <ImageCropperModal
        open={true}
        onOpenChange={vi.fn()}
        imageSrc="https://example.com/photo.jpg"
        onCropComplete={onCropCompleteMock}
      />
    );

    const applyBtn = screen.getByRole("button", { name: "imageCropper.apply" });
    fireEvent.click(applyBtn);

    expect(onCropCompleteMock).not.toHaveBeenCalled();
  });
});

