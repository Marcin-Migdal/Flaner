import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { FormColorPickerField } from "./FormColorPickerField";

type FormValues = {
  themeColor: string;
};

const TestForm = ({
  defaultValues = { themeColor: "#3b82f6" },
  onSubmit = vi.fn(),
}: {
  defaultValues?: Partial<FormValues>;
  onSubmit?: (data: FormValues) => void;
}) => {
  const form = useForm<FormValues>({ defaultValues: defaultValues as FormValues });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormColorPickerField
          control={form.control}
          name="themeColor"
          label="Theme Color"
          presetColors={["#ff0000", "#00ff00", "#3b82f6"]}
          rules={{ required: "Color is required" }}
        />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
};

describe("FormColorPickerField component", () => {
  it("renders with initial color and updates when preset clicked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm defaultValues={{ themeColor: "#3b82f6" }} onSubmit={onSubmit} />);

    expect(screen.getByLabelText("Theme Color")).toHaveValue("#3b82f6");

    const redPreset = screen.getByRole("button", { name: "Color #ff0000" });
    await user.click(redPreset);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ themeColor: "#ff0000" }),
      expect.anything()
    );
  });

  it("invokes onColorSelect, onChange, and onBlur callbacks", async () => {
    const user = userEvent.setup();
    const onColorSelect = vi.fn();
    const onChange = vi.fn();
    const onBlur = vi.fn();

    const FormWithCallbacks = () => {
      const form = useForm<FormValues>({ defaultValues: { themeColor: "#3b82f6" } });
      return (
        <FormProvider {...form}>
          <FormColorPickerField
            control={form.control}
            name="themeColor"
            label="Theme Color"
            presetColors={["#ff0000"]}
            onColorSelect={onColorSelect}
            onChange={onChange}
            onBlur={onBlur}
          />
        </FormProvider>
      );
    };

    render(<FormWithCallbacks />);

    const redPreset = screen.getByRole("button", { name: "Color #ff0000" });
    await user.click(redPreset);
    expect(onColorSelect).toHaveBeenCalledWith("#ff0000");

    const input = screen.getByLabelText("Theme Color");
    await user.click(input);
    await user.clear(input);
    await user.type(input, "#123456");
    expect(onChange).toHaveBeenCalledWith("#123456");

    await user.tab();
    expect(onBlur).toHaveBeenCalled();
  });

  it("handles undefined default value and displays validation error", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    const EmptyForm = () => {
      const form = useForm<FormValues>();
      return (
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormColorPickerField
              control={form.control}
              name="themeColor"
              label="Theme Color"
              rules={{ required: "Color is required" }}
            />
            <button type="submit">Submit</button>
          </form>
        </FormProvider>
      );
    };

    render(<EmptyForm />);
    expect(screen.getByLabelText("Theme Color")).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(await screen.findByText("Color is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
