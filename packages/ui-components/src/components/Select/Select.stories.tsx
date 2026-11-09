import type { Meta, StoryObj } from "@storybook/react-vite";
import { Select, type SelectOption } from "./Select";

const OPTIONS: SelectOption[] = [
  { value: "pla", label: "PLA" },
  { value: "petg", label: "PETG" },
  { value: "abs", label: "ABS" },
  { value: "tpu", label: "TPU" },
];

const meta = {
  title: "Inputs/Select",
  component: Select,
  args: { label: "Material", placeholder: "Choose material", options: OPTIONS, variant: "default" },
  argTypes: { variant: { control: "inline-radio", options: ["default", "glass"] } },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Selected: Story = { args: { defaultValue: OPTIONS[1] } };
export const Glass: Story = { args: { variant: "glass", defaultValue: OPTIONS[0] } };
export const Error: Story = { args: { error: "Material is required." } };
export const Disabled: Story = { args: { disabled: true, defaultValue: OPTIONS[0] } };
export const Creatable: Story = { args: { creatable: true, label: "Brand", options: [] } };
