import type { Meta, StoryObj } from "@storybook/react-vite";
import { Filter, Search } from "lucide-react";
import { IconTextField } from "./IconTextField";

const meta = {
  title: "Inputs/IconTextField",
  component: IconTextField,
  args: { icon: <Search className="size-4" />, placeholder: "Search groups...", alwaysOpen: true, size: "lg" },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg", "xl"] } },
} satisfies Meta<typeof IconTextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AlwaysOpen: Story = {};
export const Clearable: Story = { args: { isClearable: true, defaultValue: "Weekend" } };
export const Collapsible: Story = { args: { alwaysOpen: false, icon: <Filter className="size-4" />, placeholder: "Filter friends" } };
export const Error: Story = { args: { label: "Username", error: "Username is taken." } };
