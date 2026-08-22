import { addDays, addMonths, addWeeks, startOfToday, subDays, subMonths, subWeeks } from "date-fns";
import { useState } from "react";

import { BigCalendarHeader } from "./components/BigCalendarHeader";
import { BigCalendarProps } from "./types";
import { DayView } from "./views/DayView";
import { MonthView } from "./views/MonthView";
import { WeekView } from "./views/WeekView";

export function BigCalendar<T = unknown>(props: BigCalendarProps<T>) {
  const {
    view = "month",
    onViewChange,
    views,
    fitContainer,
    headerButtonContent,
    headerRightContent,
    customViews,
  } = props;
  const [currentDate, setCurrentDate] = useState<Date>(startOfToday);

  const handlePrev = () => {
    setCurrentDate((prev) => {
      if (view === "month") {
        return subMonths(prev, 1);
      }
      if (view === "week") {
        return subWeeks(prev, 1);
      }
      return subDays(prev, 1);
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      if (view === "month") {
        return addMonths(prev, 1);
      }
      if (view === "week") {
        return addWeeks(prev, 1);
      }
      return addDays(prev, 1);
    });
  };

  const handleToday = () => setCurrentDate(startOfToday());

  return (
    <div className={`flex flex-col w-full h-full rounded-xl bg-popover border overflow-hidden ${fitContainer ? "max-h-full min-h-0" : "max-w-[1200px] mx-auto"}`}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <BigCalendarHeader
        currentDate={currentDate}
        view={view}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onViewChange={onViewChange}
        views={views}
        customViews={customViews}
        headerButtonContent={headerButtonContent}
        headerRightContent={headerRightContent}
      />

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {(() => {
          if (view === "month") {
            return <MonthView currentDate={currentDate} {...props} />;
          }
          if (view === "week") {
            return <WeekView />;
          }
          if (view === "day") {
            return <DayView />;
          }
          if (customViews && customViews[view]) {
            const viewConfig = customViews[view];
            return viewConfig.render({ currentDate, ...props });
          }
          return <MonthView currentDate={currentDate} {...props} />;
        })()}
      </div>
    </div>
  );
}
