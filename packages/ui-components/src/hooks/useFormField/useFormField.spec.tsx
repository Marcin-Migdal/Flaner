import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider, type FieldPath, type FieldValues } from "react-hook-form";
import { toNumberOrNull, useFormField, type FormFieldProps } from "./useFormField";

type ProbeBaseProps = {
  label: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

type ProbeProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>> = FormFieldProps<
  ProbeBaseProps,
  TFieldValues,
  TName
> & { onRest?: (rest: object) => void };

/** Minimal FormX wrapper: a native input bound through the helper. */
function Probe<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({
  onRest,
  ...props
}: ProbeProps<TFieldValues, TName>) {
  const { field, error, rest } = useFormField(props);
  onRest?.(rest);

  return (
    <label>
      {rest.label}
      <input {...field} value={field.value ?? ""} />
      {error && <span role="alert">{error}</span>}
    </label>
  );
}

type FormValues = { title: string };

const TestForm = ({
  title = "Initial",
  disabled,
  onSubmit = vi.fn(),
  onRest,
}: {
  title?: string;
  disabled?: boolean;
  onSubmit?: (data: FormValues) => void;
  onRest?: (rest: object) => void;
}) => {
  const form = useForm<FormValues>({ defaultValues: { title } });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Probe<FormValues, "title">
          name="title"
          label="Title"
          rules={{ required: "Title is required" }}
          disabled={disabled}
          onRest={onRest}
        />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
};

describe("toNumberOrNull", () => {
  it.each([
    ["", null],
    ["0", 0],
    ["12", 12],
    ["12.5", 12.5],
    ["-3", -3],
  ])("converts %j to %j", (input, expected) => {
    expect(toNumberOrNull(input)).toBe(expected);
  });
});

describe("useFormField", () => {
  it("binds the field value and writes changes back to the form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TestForm onSubmit={onSubmit} />);

    const input = screen.getByLabelText("Title");
    expect(input).toHaveValue("Initial");

    await user.clear(input);
    await user.type(input, "Dinner");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith({ title: "Dinner" }, expect.anything());
  });

  it("maps the field error to its message", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TestForm title="" onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Title is required");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps the controller props out of the props passed on to the input", () => {
    const onRest = vi.fn();
    render(<TestForm onRest={onRest} />);

    expect(onRest).toHaveBeenLastCalledWith({ label: "Title" });
  });

  it("passes disabled to react-hook-form, which disables the field", () => {
    render(<TestForm disabled />);

    expect(screen.getByLabelText("Title")).toBeDisabled();
  });
});
