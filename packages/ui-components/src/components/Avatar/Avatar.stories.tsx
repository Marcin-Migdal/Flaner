import type { Meta, StoryObj } from "@storybook/react-vite";
import { AvatarFallback } from "../ui/avatar";
import { Avatar } from "./Avatar";

const meta = {
  title: "Components/Avatar",
  component: Avatar,
  args: { variant: "neutral" },
  argTypes: { variant: { control: "inline-radio", options: ["neutral", "brand"] } },
  render: (args) => (
    <Avatar {...args}>
      <AvatarFallback>AN</AvatarFallback>
    </Avatar>
  ),
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Fallback: Story = {};
export const Brand: Story = { args: { variant: "brand" } };
export const WithTooltip: Story = { args: { tooltip: "Anna Nowak" } };

/** Pass a person: the avatar renders the photo and works out the initials itself. */
export const Person: Story = {
  args: { variant: "brand", name: "Anna Nowak" },
  render: (args) => <Avatar {...args} />,
};
export const EmptyName: Story = { ...Person, args: { variant: "brand", name: "" } };
/** Dense avatars (grids, vote stacks) show one letter. */
export const SingleLetter: Story = { ...Person, args: { variant: "brand", name: "Anna Nowak", singleLetterInitial: true } };
