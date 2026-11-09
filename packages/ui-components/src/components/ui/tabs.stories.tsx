import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = {
  title: "Primitives/Tabs",
  component: Tabs,
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="activity" className="w-80">
      <TabsList>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="balances">Balances</TabsTrigger>
      </TabsList>
      <TabsContent value="activity" className="text-sm text-muted-foreground">
        Expenses and settlements.
      </TabsContent>
      <TabsContent value="balances" className="text-sm text-muted-foreground">
        Who owes whom.
      </TabsContent>
    </Tabs>
  ),
};
