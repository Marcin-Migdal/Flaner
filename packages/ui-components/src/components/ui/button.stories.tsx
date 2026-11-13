import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus, Trash2 } from "lucide-react";
import type { ComponentProps } from "react";
import { Button } from "./button";

type ButtonVariant = ComponentProps<typeof Button>["variant"];
type ButtonSize = ComponentProps<typeof Button>["size"];

const VARIANTS: ButtonVariant[] = ["primary", "brand", "outline", "secondary", "ghost", "destructive", "link"];
const SIZES: ButtonSize[] = ["xs", "sm", "md", "lg", "xl"];

const meta = {
  title: "Primitives/Button",
  component: Button,
  args: { children: "Save changes" },
  argTypes: {
    variant: { control: "select", options: ["primary", "outline", "brand", "secondary", "ghost", "destructive", "link"] },
    size: { control: "select", options: ["xs", "sm", "md", "lg", "xl", "icon", "icon-xs", "icon-sm", "icon-lg"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Brand: Story = { args: { variant: "brand", children: "Create group" } };

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {VARIANTS.map((variant) => (
        <Button key={variant} {...args} variant={variant}>
          {variant}
        </Button>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      {SIZES.map((size) => (
        <Button key={size} {...args} size={size}>
          {size}
        </Button>
      ))}
    </div>
  ),
};

export const WithIcon: Story = {
  args: { variant: "brand" },
  render: (args) => (
    <Button {...args}>
      <Plus /> Add expense
    </Button>
  ),
};

export const IconOnly: Story = {
  args: { variant: "outline", size: "icon", "aria-label": "Delete" },
  render: (args) => (
    <Button {...args}>
      <Trash2 />
    </Button>
  ),
};

export const Busy: Story = { args: { variant: "brand", isBusy: true, children: "Saving" } };

export const Disabled: Story = { args: { disabled: true } };
