export type BigCalendarView = "day" | "week" | "month";

export type DisabledDateMatcher = (date: Date) => boolean;

export interface DisabledDatesConfig {
  /** Disable today's date */
  today?: boolean;
  /** Disable dates before a specific date (exclusive, compared using startOfDay) */
  before?: Date;
  /** Disable dates after a specific date (exclusive, compared using startOfDay) */
  after?: Date;
  /** Specific dates to disable */
  dates?: Date[];
  /** Disable specific days of the week (0 = Sunday, 1 = Monday, ..., 6 = Saturday) */
  daysOfWeek?: number[];
  /** Custom matcher function for maximum flexibility */
  matcher?: DisabledDateMatcher;
}

export type DisabledDatesProp = DisabledDateMatcher | DisabledDatesConfig;

export interface CalendarEvent<T = unknown> {
  id: string | number;
  title: string;
  start: Date;
  end: Date;
  color?: string;
  metaData?: T;
}

export type CalendarEventComponentProps<T = unknown> = {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  event: CalendarEvent<T>;
  /** Whether this is the first day segment of the event */
  isFirstSegment: boolean;
  /** Whether this is the last day segment of the event */
  isLastSegment: boolean;
  /** Whether this slot is the first in the current calendar week row */
  isFirstInRow?: boolean;
  /** Whether this slot is the last in the current calendar week row */
  isLastInRow?: boolean;
  /** Whether this slot continues to the next day in the current calendar row */
  continuesNextInRow?: boolean;
  /** Whether this slot continues from the previous day in the current calendar row */
  continuesPrevInRow?: boolean;
  /** Whether this specific event is currently hovered. */
  isHovered: boolean;
  /** Pre-built className including continuation / hover modifiers. */
  className: string;
  /** onClick handler – already calls `e.stopPropagation()` and delegates to `onEventClick`. */
  onClick: (e: React.MouseEvent) => void;
};

export type CustomViewConfig<_T = unknown> = {
  label: string;
  render: (props: Record<string, unknown>) => React.ReactNode;
};

export type CustomViewsMap<T = unknown> = Record<string, CustomViewConfig<T>>;

type BigCalendarBaseProps<T = unknown> = {
  view?: BigCalendarView | string;
  onViewChange?: (view: string) => void;
  views?: BigCalendarView[];
  customViews?: CustomViewsMap<T>;
  events?: CalendarEvent<T>[];
  onEventClick?: (event: CalendarEvent<T>, e: React.MouseEvent) => void;
  /** Custom component used to render each event. When omitted the default event UI is used. */
  renderEvent?: React.ComponentType<CalendarEventComponentProps<T>>;
  /** Custom component used to render the "+X more" element when there are hidden events. */
  renderMoreEvents?: (hiddenEvents: CalendarEvent<T>[], day: Date) => React.ReactNode;
  maxEventsPerDay?: number;
  fitContainer?: boolean;
  headerButtonContent?: React.ReactNode;
  headerRightContent?: React.ReactNode;
  disabledDates?: DisabledDatesProp;
  slotSize?: "sm" | "md" | "lg";
};

// Uncontrolled – no selection, no hover effect on day cells
type BigCalendarUncontrolledProps<T = unknown> = BigCalendarBaseProps<T> & {
  selectionMode?: undefined;
  selectedDate?: undefined;
  onDateChange?: never;
};

// Controlled – single date selection
type BigCalendarSingleProps<T = unknown> = BigCalendarBaseProps<T> & {
  selectionMode: "single";
  selectedDate: Date | null | undefined;
  onDateChange: (date: Date | null) => void;
};

// Controlled – date range selection
type BigCalendarRangeProps<T = unknown> = BigCalendarBaseProps<T> & {
  selectionMode: "range";
  selectedDate: [Date, Date?] | null | undefined;
  onDateChange: (range: [Date, Date?] | null) => void;
};

export type BigCalendarProps<T = unknown> =
  | BigCalendarUncontrolledProps<T>
  | BigCalendarSingleProps<T>
  | BigCalendarRangeProps<T>;
