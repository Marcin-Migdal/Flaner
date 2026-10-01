import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { Search } from "lucide-react";
import { FormIconTextField } from "./FormIconTextField";

type FormValues = {
  searchQuery: string;
};

const TestForm = ({
  defaultValues = { searchQuery: "" },
  onSubmit = vi.fn(),
}: {
  defaultValues?: Partial<FormValues>;
  onSubmit?: (data: FormValues) => void;
}) => {
  const form = useForm<FormValues>({ defaultValues: defaultValues as FormValues });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormIconTextField
          control={form.control}
          name="searchQuery"
          alwaysOpen
          isClearable
          icon={<Search data-testid="search-icon" />}
          placeholder="Search..."
          rules={{ required: "Query required" }}
        />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
};

describe("FormIconTextField component", () => {
  it("binds input with react-hook-form and clears value on clear button click", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm defaultValues={{ searchQuery: "hello" }} onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText("Search...");
    expect(input).toHaveValue("hello");

    // Click clear button
    const buttons = screen.getAllByRole("button");
    const clearBtn = buttons[1]; // clear button
    await user.click(clearBtn);

    expect(input).toHaveValue("");

    await user.type(input, "new test");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ searchQuery: "new test" }),
      expect.anything()
    );
  });
});
