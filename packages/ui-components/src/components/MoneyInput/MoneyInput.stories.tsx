import type { Meta, StoryObj } from "@storybook/react-vite";
import { MoneyInput } from "./MoneyInput";

const CURRENCIES = [
  { value: "PLN", label: "PLN" },
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
];

const meta = {
  title: "Inputs/MoneyInput",
  component: MoneyInput,
  args: { label: "Amount", placeholder: "0.00", currencyOptions: CURRENCIES, defaultCurrency: "PLN" },
  render: (args) => (
    <div className="max-w-sm">
      <MoneyInput {...args} />
    </div>
  ),
} satisfies Meta<typeof MoneyInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Error: Story = { args: { error: "Amount must be greater than 0." } };
export const CurrencyLocked: Story = { args: { currencyDisabled: true, defaultValue: "120.00" } };
