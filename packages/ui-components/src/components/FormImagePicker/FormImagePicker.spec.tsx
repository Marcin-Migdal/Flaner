import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { FormImagePicker } from "./FormImagePicker";

vi.mock("../hooks/useUiTranslations", () => ({
  useUiTranslations: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "imagePicker.dropzoneIdleText": "Click or drag image to upload",
        "imagePicker.acceptedFormatsDesc": "PNG, JPG up to 5MB",
        "imagePicker.noImageSelectedTitle": "No image selected",
        "imagePicker.cloudImageDesc": "Cloud hosted image",
      };
      return translations[key] ?? key;
    },
  }),
}));

type FormValues = {
  avatar: string | null;
};

const TestForm = ({
  defaultValues = { avatar: null },
  onSubmit = vi.fn(),
}: {
  defaultValues?: Partial<FormValues>;
  onSubmit?: (data: FormValues) => void;
}) => {
  const form = useForm<FormValues>({ defaultValues: defaultValues as FormValues });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormImagePicker
          control={form.control}
          name="avatar"
          label="Avatar"
          rules={{ required: "Avatar is required" }}
        />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
};

describe("FormImagePicker component", () => {
  it("renders with image preview when initial URL provided and submits", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <TestForm
        defaultValues={{ avatar: "https://res.cloudinary.com/demo/image/upload/sample.jpg" }}
        onSubmit={onSubmit}
      />
    );

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://res.cloudinary.com/demo/image/upload/sample.jpg");

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ avatar: "https://res.cloudinary.com/demo/image/upload/sample.jpg" }),
      expect.anything()
    );
  });

  it("shows validation error on submit when empty and required", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm defaultValues={{ avatar: null }} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Avatar is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
