import { zodResolver } from "@hookform/resolvers/zod";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormProvider, useForm } from "react-hook-form";
import { fn } from "storybook/test";
import * as z from "zod";
import { FormCheckbox } from "../components/FormCheckbox";
import { FormColorPickerField } from "../components/FormColorPickerField";
import { FormDatePicker } from "../components/FormDatePicker";
import { FormMoneyInput } from "../components/FormMoneyInput";
import { FormSelect } from "../components/FormSelect";
import { FormSwitch } from "../components/FormSwitch";
import { FormTextArea } from "../components/FormTextArea";
import { FormTextField } from "../components/FormTextField";
import { Button } from "../components/ui/button";

const schema = z.object({
  name: z.string().min(3, "Name must have at least 3 characters."),
  description: z.string().max(120, "Keep it under 120 characters."),
  category: z.object({ value: z.string(), label: z.string() }, { message: "Pick a category." }),
  date: z.date({ message: "Pick a date." }),
  amount: z.string().min(1, "Enter an amount."),
  currency: z.string(),
  color: z.string(),
  recurring: z.boolean(),
  splitEqually: z.boolean(),
});

type ExpenseForm = z.infer<typeof schema>;

const CATEGORIES = [
  { value: "food", label: "Food" },
  { value: "travel", label: "Travel" },
  { value: "home", label: "Home" },
];

const CURRENCIES = [
  { value: "PLN", label: "PLN" },
  { value: "EUR", label: "EUR" },
];

function ExpenseFormDemo({ onSubmit }: { onSubmit: (data: ExpenseForm) => void }) {
  const methods = useForm<ExpenseForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", amount: "", currency: "PLN", color: "#1d4ed8", recurring: false, splitEqually: true },
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="flex max-w-md flex-col gap-4">
        <FormTextField<ExpenseForm> name="name" label="Name" placeholder="Dinner" />
        <FormTextArea<ExpenseForm> name="description" label="Description" placeholder="Optional note" />
        <FormSelect<ExpenseForm> name="category" label="Category" placeholder="Choose category" options={CATEGORIES} />
        <FormDatePicker<ExpenseForm> name="date" label="Date" placeholder="Pick a date" />
        <FormMoneyInput<ExpenseForm> amountName="amount" currencyName="currency" label="Amount" currencyOptions={CURRENCIES} />
        <FormColorPickerField<ExpenseForm> name="color" label="Colour" />
        <FormSwitch<ExpenseForm> name="recurring" label="Recurring" description="Repeat every month." />
        <FormCheckbox<ExpenseForm> name="splitEqually" label="Split equally" />
        <Button type="submit" variant="brand" className="self-start">
          Save expense
        </Button>
      </form>
    </FormProvider>
  );
}

/**
 * `Form*` components register themselves through `useController`, so they need a parent `FormProvider`
 * (see the `react-hook-form` skill). Submit the empty form to see validation errors.
 */
const meta = {
  title: "Patterns/Form",
  component: ExpenseFormDemo,
  args: { onSubmit: fn() },
} satisfies Meta<typeof ExpenseFormDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ExpenseFormExample: Story = { name: "Expense form" };
