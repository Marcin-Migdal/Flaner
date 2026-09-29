import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { FormDatePicker } from "./FormDatePicker";

vi.mock("../hooks/useUiTranslations", () => ({
  useUiTranslations: () => ({
    t: (key: string) => (key === "datePicker.selectDate" ? "Select date" : key),
    i18n: { language: "en" },
  }),
}));

type FormValues = {
  startDate?: Date;
};

const TestForm = ({
  defaultValues = {},
  onSubmit = vi.fn(),
}: {
  defaultValues?: Partial<FormValues>;
  onSubmit?: (data: FormValues) => void;
}) => {
  const form = useForm<FormValues>({ defaultValues });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormDatePicker
          control={form.control}
          name="startDate"
          label="Start date"
          rules={{ required: "Date is required" }}
        />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
};

describe("FormDatePicker component", () => {
  it("renders with label and submits form with initial date value", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const initialDate = new Date(2026, 6, 20);

    render(<TestForm defaultValues={{ startDate: initialDate }} onSubmit={onSubmit} />);

    expect(screen.getByText("Start date")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ startDate: initialDate }),
      expect.anything()
    );
  });

  it("shows validation error on submit when empty and required", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm defaultValues={{}} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Date is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
