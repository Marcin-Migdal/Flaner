/* eslint-disable jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
import {
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { enUS, pl } from "date-fns/locale";
import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { useUiTranslations } from "../../../../hooks/useUiTranslations";
import { Popover, PopoverContent, PopoverTrigger } from "../../../ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../ui/tooltip";
import { buildEventSlotGrid, dayKey, SlotEntry } from "../../helpers/buildEventSlotGrid";
import { CalendarEvent } from "../../types";
import { isDateDisabled } from "../../utils/disabledDates";
import { getCellClass } from "./helpers";
import { MonthViewProps } from "./types";

const WEEKDAYS = [
  { key: "mon" },
  { key: "tue" },
  { key: "wed" },
  { key: "thu" },
  { key: "fri" },
  { key: "sat" },
  { key: "sun" },
] as const;

const SLOT_HEIGHT_CLASSES: Record<NonNullable<MonthViewProps["slotSize"]>, string> = {
  sm: "h-[12px] md:h-[20px] min-h-[12px] md:min-h-[20px] shrink-0 text-[8px] md:text-xs",
  md: "h-[14px] md:h-[24px] min-h-[14px] md:min-h-[24px] shrink-0 text-[9px] md:text-xs",
  lg: "h-[16px] md:h-[28px] min-h-[16px] md:min-h-[28px] shrink-0 text-[10px] md:text-sm",
};

const getSlotHeightPixels = (size?: "sm" | "md" | "lg") => {
  switch (size) {
    case "sm":
      return 20;
    case "lg":
      return 28;
    case "md":
    default:
      return 24;
  }
};

export function MonthView<T = unknown>(props: MonthViewProps<T>) {
  const { currentDate, selectionMode } = props;
  const { t, i18n } = useUiTranslations();
  const dateLocale = i18n.language?.startsWith("pl") ? pl : enUS;

  // Used only in range mode for hover preview
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  // Tracks which event is currently hovered so we can highlight all its visible segments
  const [hoveredEventId, setHoveredEventId] = useState<string | number | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const [maxEventsPerDay, setMaxEventsPerDay] = useState<number>(2);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);

  useEffect(() => {
    if (!gridRef.current) {
      return;
    }
    const updateMaxEvents = () => {
      if (gridRef.current) {
        const height = gridRef.current.clientHeight;
        const weeksCount = days.length / 7;
        const availableHeight = height / weeksCount;

        // Header is ~32px, "More" button is ~24px. Total reserved = 56px.
        const slotPx = getSlotHeightPixels(props.slotSize) + 2;
        const max = Math.max(1, Math.floor((availableHeight - 56) / slotPx));
        setMaxEventsPerDay(max);
      }
    };
    updateMaxEvents();
    window.addEventListener("resize", updateMaxEvents);
    return () => window.removeEventListener("resize", updateMaxEvents);
  }, [days.length, props.slotSize]);

  // ── Slot grid ─────────────────────────────────────────────────────
  const slotGrid = useMemo(() => buildEventSlotGrid(days, props.events), [days, props.events]);

  // ── Click handler ────────────────────────────────────────────────

  const handleDayClick = (day: Date) => {
    if (!props.selectionMode || isDateDisabled(day, props.disabledDates)) {
      return;
    }

    if (props.selectionMode === "single") {
      props.onDateChange(day);
      return;
    }

    // Range mode
    const current = props.selectedDate;
    if (!current || !current[0] || (current[0] && current[1])) {
      // Start fresh range
      props.onDateChange([day]);
    } else {
      // Complete the range
      const start = current[0];
      if (isBefore(day, start)) {
        props.onDateChange([day, start]);
      } else {
        props.onDateChange([start, day]);
      }
      setHoverDate(null);
    }
  };

  // ── Hover handler (range preview only) ───────────────────────────

  const handleDayMouseEnter = (day: Date) => {
    if (props.selectionMode === "range" && props.selectedDate?.[0] && !props.selectedDate?.[1]) {
      setHoverDate(day);
    }
  };

  const handleDayMouseLeave = () => {
    if (props.selectionMode === "range") {
      setHoverDate(null);
    }
  };

  // ── Event renderer ────────────────────────────────────────────────

  const renderSlot = (entry: SlotEntry<T>, day: Date, slotIdx: number) => {
    const slotHeight = SLOT_HEIGHT_CLASSES[props.slotSize ?? "md"];

    // Empty placeholder keeps rows aligned across the week
    if (!entry) {
      return <div key={`empty-${slotIdx}`} className={`${slotHeight} mb-0.5`} />;
    }

    const { event } = entry;
    const isFirstEventSlot = startOfDay(event.start).getTime() === startOfDay(day).getTime();
    const isLastEventSlot = endOfDay(event.end).getTime() === endOfDay(day).getTime();
    const isRowStart = day.getDay() === 1; // Monday (since weekStartsOn is 1)
    const isRowEnd = day.getDay() === 0; // Sunday
    const isFirstInRow = isFirstEventSlot || isRowStart;
    const isLastInRow = isLastEventSlot || isRowEnd;
    const continuesNextInRow = !isLastEventSlot && !isRowEnd;
    const continuesPrevInRow = !isFirstEventSlot && !isRowStart;
    const isHovered = hoveredEventId !== null && hoveredEventId === event.id;

    // Use custom event component if provided
    if (props.renderEvent) {
      const CustomComponent = props.renderEvent;
      return (
        <CustomComponent
          key={event.id}
          event={event}
          isFirstEventSlot={isFirstEventSlot}
          isLastEventSlot={isLastEventSlot}
          isFirstInRow={isFirstInRow}
          isLastInRow={isLastInRow}
          continuesNextInRow={continuesNextInRow}
          continuesPrevInRow={continuesPrevInRow}
          isHovered={isHovered}
          className={`${slotHeight} mb-0.5`}
          onMouseEnter={() => setHoveredEventId(event.id)}
          onMouseLeave={() => setHoveredEventId(null)}
          onClick={(e) => {
            e.stopPropagation();
            props.onEventClick?.(event, e);
          }}
        />
      );
    }

    const roundedClasses =
      isFirstInRow && isLastInRow
        ? "rounded-md"
        : isFirstInRow
          ? "rounded-l-md rounded-r-none"
          : isLastInRow
            ? "rounded-r-md rounded-l-none"
            : "rounded-none";

    const marginClasses = continuesNextInRow
      ? "w-[calc(100%+1px)] -mr-[1px] relative z-[1]"
      : "w-full";
    const paddingClasses = `${
      isFirstInRow && isLastInRow
        ? "px-1 md:px-2"
        : isFirstInRow
          ? "pl-1 md:pl-2 pr-0.5"
          : isLastInRow
            ? "pl-0.5 pr-1 md:pr-2"
            : "px-0.5"
    }`;

    // Default event renderer
    return (
      <TooltipProvider key={event.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`
                group/event flex items-center justify-between truncate cursor-pointer select-none
                ${slotHeight} mb-[1px] md:mb-0.5 ${roundedClasses} ${marginClasses} ${paddingClasses}
                transition-all duration-150 ease-in-out
                ${event.color ? "text-white" : "bg-brand/10 text-brand-foreground hover:bg-brand/20"}
                ${isHovered ? "z-10 shadow-md ring-1 ring-white/40 brightness-105" : ""}
              `}
              style={event.color ? ({ backgroundColor: event.color } as CSSProperties) : undefined}
              onMouseEnter={() => setHoveredEventId(event.id)}
              onMouseLeave={() => setHoveredEventId(null)}
              onClick={(e) => {
                e.stopPropagation();
                props.onEventClick?.(event, e);
              }}
            >
              <span className="truncate font-medium">{event.title}</span>
              {isLastInRow && (
                <button
                  type="button"
                  className="opacity-0 group-hover/event:opacity-100 hover:text-destructive hover:bg-background/20 p-0.5 rounded transition-all duration-150"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    props.onEventClick?.(event, e);
                  }}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex flex-col gap-1">
              <span className="font-semibold">{event.title}</span>
              <span className="text-xs text-muted-foreground">
                {format(event.start, "d MMM yyyy", { locale: dateLocale })} -{" "}
                {format(event.end, "d MMM yyyy", { locale: dateLocale })}
              </span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 min-h-full">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b text-center text-xs font-semibold text-muted-foreground py-2 bg-muted/30 shrink-0 sticky top-0 z-20 backdrop-blur-md">
        {WEEKDAYS.map((day) => (
          <div key={day.key} className="py-1">
            <span className="md:hidden">{t(`calendar.days.${day.key}`)}</span>
            <span className="hidden md:inline">{t(`calendar.daysFull.${day.key}`)}</span>
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div
        ref={gridRef}
        className="grid grid-cols-7 flex-1 divide-x divide-y border-b"
        style={{
          gridTemplateRows: `repeat(${days.length / 7}, minmax(0, 1fr))`,
        }}
      >
        {days.map((day, index) => {
          const key = dayKey(day);
          const allSlots = slotGrid.get(key) ?? [];
          const actualMax = props.maxEventsPerDay ?? maxEventsPerDay;
          const visibleSlots = allSlots.slice(0, actualMax);
          const hiddenSlots = allSlots.slice(actualMax);
          const hiddenEvents: CalendarEvent<T>[] = hiddenSlots
            .filter((s): s is { event: CalendarEvent<T> } => s !== null)
            .map((s) => s.event);
          const hiddenEventsCount = hiddenEvents.length;

          const disabled = isDateDisabled(day, props.disabledDates);

          return (
            <div
              key={key}
              onClick={() => handleDayClick(day)}
              onMouseEnter={() => handleDayMouseEnter(day)}
              onMouseLeave={handleDayMouseLeave}
              className={`flex flex-col min-h-0 overflow-visible ${getCellClass({
                day,
                index,
                currentDate,
                days,
                selectionMode,
                hasEvents: allSlots.some(Boolean),
                selectedDate: props.selectedDate,
                hoverDate,
                isDisabled: disabled,
              })}`}
            >
              {/* Day header: number + selection clear */}
              <div className="flex items-center justify-between px-2 pt-1 pb-0.5 shrink-0">
                <span
                  className={`
                    text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center
                    ${isToday(day) ? "bg-brand text-brand-foreground font-bold shadow-sm" : "text-foreground/80"}
                  `}
                >
                  {format(day, "d")}
                </span>

                {/* Clear selection buttons for range start/end */}
                {selectionMode === "range" &&
                  props.selectedDate?.[0] &&
                  startOfDay(props.selectedDate[0]).getTime() === startOfDay(day).getTime() && (
                    <button
                      type="button"
                      className="p-0.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        props.onDateChange(null);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                {selectionMode === "range" &&
                  props.selectedDate?.[1] &&
                  startOfDay(props.selectedDate[1]).getTime() === startOfDay(day).getTime() && (
                    <button
                      type="button"
                      className="p-0.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (Array.isArray(props.selectedDate) && props.selectedDate[0]) {
                          props.onDateChange([props.selectedDate[0]]);
                        }
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
              </div>

              {/* Event slot rows */}
              <div className="flex-1 flex flex-col min-h-0 overflow-visible relative pt-0.5">
                {visibleSlots.map((entry, idx) => renderSlot(entry, day, idx))}

                {/* +X more popover */}
                {hiddenEventsCount > 0 &&
                  (props.renderMoreEvents ? (
                    props.renderMoreEvents(hiddenEvents, day)
                  ) : (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="text-[10px] md:text-[11px] text-muted-foreground hover:text-foreground cursor-pointer px-1 mx-0.5 font-semibold md:font-medium hover:bg-muted/50 rounded-md py-0 mt-0.5 transition-colors block text-left bg-transparent border-0 truncate leading-tight"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="md:hidden">+{hiddenEventsCount}</span>
                          <span className="hidden md:inline">
                            {t("calendar.moreEvents", { count: hiddenEventsCount })}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="p-2 w-56 flex flex-col gap-1 z-50 bg-popover/95 backdrop-blur-md shadow-xl border border-border/80 rounded-xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-xs font-semibold px-1 pb-1 border-b text-muted-foreground">
                          {format(day, "d MMMM yyyy", { locale: dateLocale })}
                        </div>
                        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pt-1">
                          {allSlots
                            .filter((s): s is { event: CalendarEvent<T> } => s !== null)
                            .map(({ event }) => (
                              <div
                                key={event.id}
                                className="text-xs px-2 py-1 rounded-md font-medium truncate cursor-pointer transition-all duration-150 hover:brightness-110"
                                style={
                                  event.color
                                    ? ({ backgroundColor: event.color, color: "#fff" } as CSSProperties)
                                    : undefined
                                }
                                onClick={(e) => {
                                  props.onEventClick?.(event, e);
                                }}
                              >
                                {event.title}
                              </div>
                            ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
