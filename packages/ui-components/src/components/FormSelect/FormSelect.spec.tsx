import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { FormSelect } from "./FormSelect";

type FormValues = {
  fruit: string;
};

const options = [
  { label: "Apple", value: "apple" },
  { label: "Banana", value: "banana" },
  { label: "Orange", value: "orange" },
];

const TestForm = ({
  defaultValues = { fruit: "" },
  onSubmit = vi.fn(),
}: {
  defaultValues?: Partial<FormValues>;
  onSubmit?: (data: FormValues) => void;
}) => {
  const form = useForm<FormValues>({ defaultValues: defaultValues as FormValues });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormSelect
          control={form.control}
          name="fruit"
          label="Favorite Fruit"
          placeholder="Pick a fruit..."
          options={options}
          rules={{ required: "Fruit is required" }}
        />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
};

describe("FormSelect component", () => {
  it("renders with placeholder and submits selected value", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm defaultValues={{ fruit: "" }} onSubmit={onSubmit} />);

    expect(screen.getByText("Pick a fruit...")).toBeInTheDocument();

    await user.click(screen.getByText("Pick a fruit..."));
    const option = await screen.findByText("Banana");
    await user.click(option);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ fruit: "banana" }),
      expect.anything()
    );
  });

  it("shows validation error on submit when empty and required", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm defaultValues={{ fruit: "" }} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Fruit is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("resolves selectedOption from grouped options", () => {
    const groupedOptions = [
      {
        label: "Citrus",
        options: [
          { label: "Lemon", value: "lemon" },
          { label: "Lime", value: "lime" },
        ],
      },
    ];

    const GroupForm = () => {
      const form = useForm({ defaultValues: { fruit: "lime" } });
      return (
        <FormProvider {...form}>
          <FormSelect control={form.control} name="fruit" options={groupedOptions} />
        </FormProvider>
      );
    };

    render(<GroupForm />);
    expect(screen.getByText("Lime")).toBeInTheDocument();
  });

  it("resolves selectedOption when creatable is true and value not in options", () => {
    const CreatableForm = () => {
      const form = useForm({ defaultValues: { fruit: "Mango" } });
      return (
        <FormProvider {...form}>
          <FormSelect control={form.control} name="fruit" creatable options={options} />
        </FormProvider>
      );
    };

    render(<CreatableForm />);
    expect(screen.getByText("Mango")).toBeInTheDocument();
  });

  it("handles undefined options and grouped options mismatch", () => {
    const NoOptionsForm = () => {
      const form = useForm({ defaultValues: { fruit: "banana" } });
      return (
        <FormProvider {...form}>
          <FormSelect control={form.control} name="fruit" />
        </FormProvider>
      );
    };

    render(<NoOptionsForm />);

    const MultiGroupForm = () => {
      const form = useForm({ defaultValues: { fruit: "unknown" } });
      return (
        <FormProvider {...form}>
          <FormSelect
            control={form.control}
            name="fruit"
            placeholder="Choose fruit"
            options={[
              {
                label: "Citrus",
                options: [{ label: "Lemon", value: "lemon" }],
              },
              {
                label: "Berries",
                options: [{ label: "Strawberry", value: "strawberry" }],
              },
            ]}
          />
        </FormProvider>
      );
    };

    render(<MultiGroupForm />);
    expect(screen.getByText("Choose fruit")).toBeInTheDocument();
  });

  it("handles clearing the value when option is cleared", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    const ClearableForm = () => {
      const form = useForm({ defaultValues: { fruit: "apple" } });
      return (
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormSelect
              control={form.control}
              name="fruit"
              options={options}
              isClearable
            />
            <button type="submit">Submit</button>
          </form>
        </FormProvider>
      );
    };

    const { container } = render(<ClearableForm />);
    expect(screen.getByText("Apple")).toBeInTheDocument();

    const clearButton = container.querySelector(".react-select__clear-indicator");
    if (clearButton) {
      await user.click(clearButton);
    }

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ fruit: "" }),
      expect.anything()
    );
  });
});
