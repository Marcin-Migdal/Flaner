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

  it("displays validation error when required field is empty on submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm defaultValues={{ username: "", age: 20 }} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Username is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
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
});
