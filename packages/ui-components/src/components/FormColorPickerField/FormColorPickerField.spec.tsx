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
});
