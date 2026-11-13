import type { Meta, StoryObj } from "@storybook/react-vite";
import { addDays, startOfMonth } from "date-fns";
import { BigCalendar } from "./BigCalendar";
import type { CalendarEvent } from "./types";

const monthStart = startOfMonth(new Date());

const EVENTS: CalendarEvent[] = [
  { id: 1, title: "Weekend trip", start: addDays(monthStart, 8), end: addDays(monthStart, 9), color: "var(--event-blue)" },
  { id: 2, title: "Board games", start: addDays(monthStart, 12), end: addDays(monthStart, 12), color: "var(--event-teal)" },
  { id: 3, title: "Climbing", start: addDays(monthStart, 12), end: addDays(monthStart, 14), color: "var(--event-pink)" },
  { id: 4, title: "Cinema", start: addDays(monthStart, 20), end: addDays(monthStart, 20), color: "var(--event-violet)" },
];

const meta = {
  title: "Components/BigCalendar",
  component: BigCalendar,
  args: { events: EVENTS, view: "month", views: ["month"] },
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <div className="h-[640px] p-4">
      <BigCalendar {...args} fitContainer />
    </div>
  ),
} satisfies Meta<typeof BigCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Month: Story = {};
