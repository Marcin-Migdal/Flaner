import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DatePicker, type DatePickerProps } from "./DatePicker";

function ControlledDatePicker(props: DatePickerProps) {
  const [value, setValue] = useState<Date | undefined>(props.value);
  return <DatePicker {...props} value={value} onChange={setValue} />;
}

const meta = {
  title: "Inputs/DatePicker",
  component: DatePicker,
  args: { label: "End date", placeholder: "Pick a date" },
  render: (args) => (
    <div className="max-w-xs">
      <ControlledDatePicker {...args} />
    </div>
  ),
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithValue: Story = { args: { value: new Date(2026, 10, 14) } };
export const Error: Story = { args: { error: "End date cannot be in the past." } };
export const Disabled: Story = { args: { disabled: true, value: new Date(2026, 10, 14) } };
