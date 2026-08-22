import { CalendarEvent, CalendarEventComponentProps, DisabledDatesProp } from "../../types";

export type MonthViewUncontrolledProps = {
  currentDate: Date;
  selectionMode?: undefined;
  selectedDate?: undefined;
  onDateChange?: never;
};

export type MonthViewSingleProps = {
  currentDate: Date;
  selectionMode: "single";
  selectedDate: Date | null | undefined;
  onDateChange: (date: Date | null) => void;
};

export type MonthViewRangeProps = {
  currentDate: Date;
  selectionMode: "range";
  selectedDate: [Date, Date?] | null | undefined;
  onDateChange: (range: [Date, Date?] | null) => void;
};

export type MonthViewBaseProps<T = unknown> = {
  events?: CalendarEvent<T>[];
  onEventClick?: (event: CalendarEvent<T>, e: React.MouseEvent) => void;
  renderEvent?: React.ComponentType<CalendarEventComponentProps<T>>;
  renderMoreEvents?: (events: CalendarEvent<T>[], day: Date) => React.ReactNode;
  maxEventsPerDay?: number;
  disabledDates?: DisabledDatesProp;
  slotSize?: "sm" | "md" | "lg";
};

export type MonthViewProps<T = unknown> = MonthViewBaseProps<T> &
  (MonthViewUncontrolledProps | MonthViewSingleProps | MonthViewRangeProps);
