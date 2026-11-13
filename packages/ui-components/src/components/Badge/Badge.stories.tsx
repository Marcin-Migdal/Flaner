import type { Meta, StoryObj } from "@storybook/react-vite";
import type { BadgeVariantsProps } from "./Badge.styles";
import { Badge } from "./Badge";

type BadgeVariant = BadgeVariantsProps["variant"];

const VARIANTS: BadgeVariant[] = ["neutral", "outline", "brand", "success", "warning", "danger", "info", "solid", "solid-danger"];

const meta = {
  title: "Components/Badge",
  component: Badge,
  args: { children: "Invited", variant: "neutral", shape: "pill", size: "md" },
  argTypes: {
    variant: { control: "select", options: VARIANTS },
    shape: { control: "inline-radio", options: ["pill", "tag", "count"] },
    size: { control: "inline-radio", options: ["sm", "md"] },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Variants: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-2">
      {VARIANTS.map((variant) => (
        <Badge key={variant} {...args} variant={variant}>
          {variant}
        </Badge>
      ))}
    </div>
  ),
};

export const Count: Story = { args: { shape: "count", size: "sm", variant: "solid-danger", children: "3" } };
export const Tag: Story = { args: { shape: "tag", size: "sm", variant: "brand", children: "PLA" } };
