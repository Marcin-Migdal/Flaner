import type { Meta, StoryObj } from "@storybook/react-vite";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";

const meta = {
  title: "Primitives/Accordion",
  component: Accordion,
  args: { type: "single", collapsible: true, defaultValue: "expenses" },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <Accordion {...args} className="w-96">
      <AccordionItem value="expenses">
        <AccordionTrigger>Expenses</AccordionTrigger>
        <AccordionContent>Two expenses in November.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="settlements">
        <AccordionTrigger>Settlements</AccordionTrigger>
        <AccordionContent>One payment to confirm.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
