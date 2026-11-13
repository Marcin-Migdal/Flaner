import type { Meta, StoryObj } from "@storybook/react-vite";
import { ArrowLeft, Plus, Users } from "lucide-react";
import { Button } from "../ui/button";
import { PageHeader } from "./PageHeader";

const meta = {
  title: "Components/PageHeader",
  component: PageHeader,
  args: { title: "Groups" },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithIconAndActions: Story = {
  args: {
    icon: <Users />,
    actions: (
      <Button variant="brand">
        <Plus /> Create group
      </Button>
    ),
  },
};

export const WithDescriptionAndBack: Story = {
  args: {
    title: "Spooler",
    description: "Track remaining weights and inventory on your 3D printer filament spools.",
    back: (
      <Button variant="ghost" size="sm">
        <ArrowLeft /> Back
      </Button>
    ),
  },
};
