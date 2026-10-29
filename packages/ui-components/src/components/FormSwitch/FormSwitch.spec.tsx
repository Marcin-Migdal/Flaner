import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { FormSwitch } from "./FormSwitch";

type FormValues = {
  notifications: boolean;
};

const TestForm = ({
  defaultValues = { notifications: false },
  onSubmit = vi.fn(),
}: {
  defaultValues?: Partial<FormValues>;
  onSubmit?: (data: FormValues) => void;
}) => {
  const form = useForm<FormValues>({ defaultValues: defaultValues as FormValues });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormSwitch
          control={form.control}
          name="notifications"
          label="Enable notifications"
        />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
};

describe("FormSwitch component", () => {
  it("renders with default unchecked state and toggles on click", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm defaultValues={{ notifications: false }} onSubmit={onSubmit} />);

    const switchEl = screen.getByLabelText("Enable notifications");
    expect(switchEl).not.toBeChecked();

    await user.click(switchEl);
    expect(switchEl).toBeChecked();

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ notifications: true }),
      expect.anything()
    );
  });
});
