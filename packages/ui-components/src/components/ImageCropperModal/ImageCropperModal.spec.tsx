import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImageCropperModal } from "./ImageCropperModal";

vi.mock("react-easy-crop", () => ({
  default: () => <div data-testid="mock-cropper">Cropper Area</div>,
}));

vi.mock("../../utils/cropImage", () => ({
  getCroppedImg: vi.fn().mockResolvedValue(new File(["data"], "test.webp", { type: "image/webp" })),
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

  it("does not render dialog content when open is false", () => {
    render(
      <ImageCropperModal
        open={false}
        onOpenChange={vi.fn()}
        imageSrc="https://example.com/photo.jpg"
        onCropComplete={vi.fn()}
      />
    );

    expect(screen.queryByTestId("mock-cropper")).not.toBeInTheDocument();
  });
});
