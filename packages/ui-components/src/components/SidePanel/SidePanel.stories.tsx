import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "../Avatar";
import { ListItem } from "../ListItem";
import { Button } from "../ui/button";
import { Sheet, SheetTrigger } from "../ui/sheet";
import { SidePanel } from "./SidePanel";

/** Side panel for browsing or managing a collection (invitations, requests). Wrap it in `Sheet` with your own `SheetTrigger`. */
const meta = {
  title: "Components/SidePanel",
  component: SidePanel,
  args: { title: "Invitations", description: "People who want to be your friends." },
  render: (args) => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Open panel</Button>
      </SheetTrigger>
      <SidePanel {...args}>
        {["Anna Nowak", "Jan Kowalski"].map((name, index) => (
          <ListItem
            key={name}
            leading={<Avatar variant="brand" name={name} />}
            title={name}
            trailing={
              <Button size="sm" variant="brand" isBusy={index === 1}>
                Accept
              </Button>
            }
          />
        ))}
      </SidePanel>
    </Sheet>
  ),
} satisfies Meta<typeof SidePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Open: Story = {
  render: (args) => (
    <Sheet defaultOpen>
      <SidePanel {...args}>
        <ListItem leading={<Avatar variant="brand" name="Anna Nowak" />} title="Anna Nowak" />
      </SidePanel>
    </Sheet>
  ),
};
