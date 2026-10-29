import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MoneyInput } from "./MoneyInput";

describe("MoneyInput component", () => {
  it("renders with label, placeholder, and default currency PLN", () => {
    render(
      <MoneyInput
        label="Amount"
        placeholder="10.00"
        description="Enter cost in PLN"
      />
    );

    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("10.00")).toBeInTheDocument();
    expect(screen.getByText("Enter cost in PLN")).toBeInTheDocument();
    expect(screen.getByText("PLN")).toBeInTheDocument();
  });

  it("handles amount input typing", async () => {
    const user = userEvent.setup();
    const onChangeMock = vi.fn();

    render(
      <MoneyInput
        label="Price"
        onChange={onChangeMock}
      />
    );

    const input = screen.getByLabelText("Price");
    await user.type(input, "45.50");

    expect(onChangeMock).toHaveBeenCalled();
  });

  it("allows selecting a different currency when currencyOptions provided", async () => {
    const user = userEvent.setup();
    const onCurrencyChangeMock = vi.fn();

    const options = [
      { label: "PLN (zł)", value: "PLN" },
      { label: "EUR (€)", value: "EUR" },
      { label: "USD ($)", value: "USD" },
    ];

    render(
      <MoneyInput
        label="Total"
        currency="PLN"
        currencyOptions={options}
        onCurrencyChange={onCurrencyChangeMock}
      />
    );

    const currencySelect = screen.getByText("PLN");
    await user.click(currencySelect);

    const eurOption = await screen.findByText("EUR (€)");
    await user.click(eurOption);

    expect(onCurrencyChangeMock).toHaveBeenCalledWith("EUR");
  });

  it("renders error states for amount and currency", () => {
    render(
      <MoneyInput
        label="Budget"
        error="Amount is invalid"
        currencyError="Unsupported currency"
      />
    );

    expect(screen.getByText("Amount is invalid")).toBeInTheDocument();
    expect(screen.getByText("Unsupported currency")).toBeInTheDocument();
  });

  it("disables inputs when disabled is true", () => {
    render(
      <MoneyInput
        label="Disabled"
        disabled
        currencyDisabled
      />
    );

    expect(screen.getByLabelText("Disabled")).toBeDisabled();
  });

  it("handles custom currencyLabel, custom formatCurrencyOptionLabel, and >5 searchable options", async () => {
    const user = userEvent.setup();
    const customFormat = vi.fn((opt) => `Formatted: ${opt.label}`);
    const sixOptions = [
      { label: "PLN", value: "PLN" },
      { label: "EUR", value: "EUR" },
      { label: "USD", value: "USD" },
      { label: "GBP", value: "GBP" },
      { label: "CHF", value: "CHF" },
      { label: "JPY", value: "JPY" },
    ];

    render(
      <MoneyInput
        currencyLabel="Select Currency"
        currency="EUR"
        currencyOptions={sixOptions}
        formatCurrencyOptionLabel={customFormat}
      />
    );

    expect(screen.getByText("Formatted: EUR")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Select Currency" })).toBeInTheDocument();

    // Select without onCurrencyChange callback
    const select = screen.getByText("Formatted: EUR");
    await user.click(select);
    const jpy = await screen.findByText("Formatted: JPY");
    await user.click(jpy);
  });

  it("handles unmatched currency fallback and empty activeCode without label", () => {
    // Unmatched currency in options
    render(
      <MoneyInput
        currency="BTC"
        currencyOptions={[{ label: "EUR", value: "EUR" }]}
      />
    );
    expect(screen.getByText("BTC")).toBeInTheDocument();

    // Empty currency and empty defaultCurrency without label
    const { unmount } = render(
      <MoneyInput
        currency=""
        defaultCurrency=""
        currencyPlaceholder="No currency"
      />
    );
    expect(screen.getByText("No currency")).toBeInTheDocument();
    unmount();
  });
});
