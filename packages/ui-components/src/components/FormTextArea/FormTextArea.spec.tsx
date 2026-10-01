import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { FormTextArea } from "./FormTextArea";

type FormValues = {
  bio: string;
};

const TestForm = ({
  defaultValues = { bio: "" },
  onSubmit = vi.fn(),
}: {
  defaultValues?: Partial<FormValues>;
  onSubmit?: (data: FormValues) => void;
}) => {
  const form = useForm<FormValues>({ defaultValues: defaultValues as FormValues });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormTextArea
          control={form.control}
          name="bio"
          label="Bio"
          rules={{ required: "Bio cannot be empty" }}
        />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
};

describe("FormTextArea component", () => {
  it("renders with initial value and binds changes", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm defaultValues={{ bio: "Initial bio text" }} onSubmit={onSubmit} />);

    const textarea = screen.getByLabelText("Bio");
    expect(textarea).toHaveValue("Initial bio text");

    await user.type(textarea, " updated");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ bio: "Initial bio text updated" }),
      expect.anything()
    );
  });

  it("shows validation error on submit when required and empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm defaultValues={{ bio: "" }} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Bio cannot be empty")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
