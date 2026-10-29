import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, FormProvider } from "react-hook-form";
import { FormMoneyInput } from "./FormMoneyInput";

type FormValues = {
  price: number;
  currency: string;
};

const currencyOptions = [
  { label: "PLN", value: "PLN" },
  { label: "EUR", value: "EUR" },
  { label: "USD", value: "USD" },
];

const TestForm = ({
  defaultValues = { price: 10, currency: "PLN" },
  onSubmit = vi.fn(),
}: {
  defaultValues?: Partial<FormValues>;
  onSubmit?: (data: FormValues) => void;
}) => {
  const form = useForm<FormValues>({ defaultValues: defaultValues as FormValues });

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormMoneyInput
          control={form.control}
          amountName="price"
          currencyName="currency"
          label="Price"
          currencyOptions={currencyOptions}
          amountRules={{ required: "Price is required" }}
        />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
};

describe("FormMoneyInput component", () => {
  it("renders with initial amount and currency, and updates both", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm defaultValues={{ price: 50, currency: "PLN" }} onSubmit={onSubmit} />);

    const priceInput = screen.getByLabelText("Price");
    expect(priceInput).toHaveValue(50);
    expect(screen.getByText("PLN")).toBeInTheDocument();

    fireEvent.change(priceInput, { target: { value: "100" } });

    await user.click(screen.getByText("PLN"));
    const eurOption = await screen.findByText("EUR");
    await user.click(eurOption);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ price: 100, currency: "EUR" }),
      expect.anything()
    );
  });

  it("shows error when required amount is cleared", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm defaultValues={{ price: undefined, currency: "PLN" }} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(await screen.findByText("Price is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("increments amount with stepper and updates form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<TestForm defaultValues={{ price: 10, currency: "PLN" }} onSubmit={onSubmit} />);

    const incrementBtn = screen.getByRole("button", { name: /increment/i });
    await user.click(incrementBtn);

    await user.click(screen.getByRole("button", { name: "Submit" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ price: 10.01 }),
      expect.anything()
    );
  });

  it("renders with fixed prop currency when currencyName is omitted", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    const FormWithoutCurrencyField = () => {
      const form = useForm({ defaultValues: { price: 25 } });
      return (
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FormMoneyInput
              control={form.control}
              name="price"
              currency="USD"
              label="Price"
            />
            <button type="submit">Submit</button>
          </form>
        </FormProvider>
      );
    };

    render(<FormWithoutCurrencyField />);
    expect(screen.getByText("USD")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalledWith({ price: 25 }, expect.anything());
  });

  it("throws error when neither name nor amountName is specified", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      const TestEmpty = () => {
        const form = useForm();
        // @ts-expect-error testing missing props
        return <FormMoneyInput control={form.control} />;
      };
      render(<TestEmpty />);
    }).toThrow("FormMoneyInput requires either 'name' or 'amountName' to be specified.");

    consoleError.mockRestore();
  });

  it("handles clearing input via change event, rules fallback, and currency change callback", async () => {
    const user = userEvent.setup();
    const onCurrencyChange = vi.fn();

    const FormWithRules = () => {
      const form = useForm<FormValues>({ defaultValues: { price: 50, currency: "PLN" } });
      return (
        <FormProvider {...form}>
          <FormMoneyInput
            control={form.control}
            name="price"
            currencyName="currency"
            currencyOptions={currencyOptions}
            rules={{ required: "Fallback rules required" }}
            onCurrencyChange={onCurrencyChange}
            error="External error message"
          />
        </FormProvider>
      );
    };

    render(<FormWithRules />);
    expect(screen.getByText("External error message")).toBeInTheDocument();

    const priceInput = screen.getByDisplayValue("50");
    fireEvent.change(priceInput, { target: { value: "" } });

    await user.click(screen.getByText("PLN"));
    const eurOption = await screen.findByText("EUR");
    await user.click(eurOption);

    expect(onCurrencyChange).toHaveBeenCalledWith("EUR");
  });
});
