import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { FormTextField } from "./FormTextField";

type FormValues = {
  username: string;
  age: number;
};

const TestForm = ({
  defaultValues = { username: "", age: 18 },
  onSubmit = vi.fn(),
}: {
  defaultValues?: Partial<FormValues>;
  onSubmit?: (data: FormValues) => void;
}) => {
  const form = useForm<FormValues>({ defaultValues: defaultValues as FormValues });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormTextField
          control={form.control}
          name="username"
          label="Username"
          rules={{ required: "Username is required" }}
        />
        <FormTextField
          control={form.control}
          name="age"
          type="number"
          label="Age"
        />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
};

describe("FormTextField component", () => {
  it("renders with react-hook-form initial values and binds changes", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm defaultValues={{ username: "initialUser", age: 25 }} onSubmit={onSubmit} />);

    const usernameInput = screen.getByLabelText("Username");
    expect(usernameInput).toHaveValue("initialUser");

    await user.clear(usernameInput);
    await user.type(usernameInput, "newUsername");

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "newUsername",
        age: 25,
      }),
      expect.anything()
    );
  });

  it("parses number inputs correctly", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm defaultValues={{ username: "Alice", age: 30 }} onSubmit={onSubmit} />);

    const ageInput = screen.getByLabelText("Age");
    fireEvent.change(ageInput, { target: { value: "42" } });

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "Alice",
        age: 42,
      }),
      expect.anything()
    );
  });

  it("handles stepper buttons and empty number input", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm defaultValues={{ username: "Alice", age: 10 }} onSubmit={onSubmit} />);

    const incrementBtn = screen.getByRole("button", { name: /increment/i });
    await user.click(incrementBtn);

    const ageInput = screen.getByLabelText("Age");
    fireEvent.change(ageInput, { target: { value: "" } });

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        username: "Alice",
        age: null,
      }),
      expect.anything()
    );
  });

  it("defaults undefined field values to empty string", () => {
    const UndefinedForm = () => {
      const form = useForm<FormValues>();
      return (
        <FormProvider {...form}>
          <FormTextField control={form.control} name="username" label="Username" />
        </FormProvider>
      );
    };

    render(<UndefinedForm />);
    expect(screen.getByLabelText("Username")).toHaveValue("");
  });

  it("keeps a cleared number field empty instead of showing its default value again (#106)", async () => {
    const user = userEvent.setup();
    render(<TestForm defaultValues={{ username: "", age: 975 }} />);
    const input = screen.getByLabelText("Age");

    await user.clear(input);
    expect(input).toHaveValue(null);

    await user.type(input, "1000");
    expect(input).toHaveValue(1000);
  });
});
