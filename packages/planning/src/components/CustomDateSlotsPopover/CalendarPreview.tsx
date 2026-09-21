import type { Locale } from "date-fns";
import { Calendar } from "@flaner/ui-components";
import type { RangeClassification } from "../../utils/generateCustomDateSlots";
import { customSlotsStyles } from "./CustomDateSlotsPopover.styles";

export type CalendarPreviewProps = {
  selectedDates: Date[];
  rangeClassification: RangeClassification;
  calendarMonth: Date;
  onMonthChange: (date: Date) => void;
  locale: Locale;
};

export const CalendarPreview = ({
  selectedDates,
  rangeClassification,
  calendarMonth,
  onMonthChange,
  locale,
}: CalendarPreviewProps) => {
  return (
    <div className={customSlotsStyles.calendarColumn}>
      <Calendar
        mode="multiple"
        selected={selectedDates}
        onSelect={() => {}}
        modifiers={{
          range_start: rangeClassification.rangeStartDates,
          range_middle: rangeClassification.rangeMiddleDates,
          range_end: rangeClassification.rangeEndDates,
        }}
        classNames={{
          range_start:
            "rounded-l-(--cell-radius) bg-primary after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-primary",
          range_middle: "rounded-none bg-primary",
          range_end:
            "rounded-r-(--cell-radius) bg-primary after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-primary",
        }}
        modifiersClassNames={{
          range_start:
            "[&_button]:!rounded-l-(--cell-radius) [&_button]:!rounded-r-none [&_button]:!bg-primary [&_button]:!text-primary-foreground",
          range_middle:
            "[&_button]:!rounded-none [&_button]:!bg-primary [&_button]:!text-primary-foreground",
          range_end:
            "[&_button]:!rounded-r-(--cell-radius) [&_button]:!rounded-l-none [&_button]:!bg-primary [&_button]:!text-primary-foreground",
        }}
        month={calendarMonth}
        onMonthChange={onMonthChange}
        locale={locale}
        weekStartsOn={1}
        className="p-0 [&_button[data-day]]:pointer-events-none [&_button[data-day]]:cursor-default"
      />
    </div>
  );
};

export default CalendarPreview;
