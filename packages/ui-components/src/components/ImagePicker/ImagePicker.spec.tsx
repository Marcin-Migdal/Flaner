import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImagePicker } from "./ImagePicker";

vi.mock("../../hooks/useUiTranslations", () => ({
  useUiTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "imagePicker.dropzoneIdleText": "Click or drag image to upload",
        "imagePicker.acceptedFormatsDesc": "PNG, JPG up to 5MB",
        "imagePicker.noImageSelectedTitle": "No image selected",
        "imagePicker.cloudImageDesc": "Cloud hosted image",
        "imagePicker.invalidFileType": "Invalid file type",
      };
      return translations[key] ?? key;
    },
  }),
}));

describe("ImagePicker component", () => {
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
  });

  it("renders image preview when URL string is passed as value", () => {
    render(
      <ImagePicker
        label="Cover Image"
        value="https://res.cloudinary.com/demo/image/upload/sample.jpg"
      />
    );

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://res.cloudinary.com/demo/image/upload/sample.jpg");
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

    // Find the delete button
    const deleteBtn = screen.getByRole("button", { name: "" }); // or trash button
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
});
