import type { Meta, StoryObj } from "@storybook/react-vite";
import { Profile } from "./Profile";

const meta = {
  title: "Components/Profile",
  component: Profile,
  args: { username: "anna", size: "md", showName: true },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
} satisfies Meta<typeof Profile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Large: Story = { args: { size: "lg" } };
export const AvatarOnly: Story = { args: { showName: false } };
