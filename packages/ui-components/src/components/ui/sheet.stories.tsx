import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./sheet";

/** Browsing or managing a collection / secondary context (members, invitations, mobile filters). */
const meta = {
  title: "Primitives/Sheet",
  component: Sheet,
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Invitations</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Invitations</SheetTitle>
          <SheetDescription>People who want to join your groups.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
};
