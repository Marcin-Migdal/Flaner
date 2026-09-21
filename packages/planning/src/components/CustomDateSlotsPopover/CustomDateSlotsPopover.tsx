import React, { useState, useMemo, useRef } from "react";
import { format, addMonths, differenceInCalendarDays, addDays } from "date-fns";
import { pl, enGB } from "date-fns/locale";
import { Layers, Check } from "lucide-react";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from "@flaner/ui-components";
import { cn } from "@flaner/shared/utils";
import { useIsMobile } from "@flaner/shared/hooks";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { customSlotsStyles } from "./CustomDateSlotsPopover.styles";
import { CalendarPreview } from "./CalendarPreview";
import { PresetSelector } from "./PresetSelector";
import { RecurrenceControls } from "./RecurrenceControls";

export type RepeatUnit = "day" | "week" | "month";
export type MonthSubMode = "each" | "onThe" | "workday";
export type MonthOrdinal = "first" | "second" | "third" | "fourth" | "fifth" | "last";
export type MonthWeekday = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
export type MonthWorkdayType = "first" | "last";
export type PresetType = "daily" | "weekly" | "monthly" | "weekdays" | "weekends" | "custom";

export type UnitOption = {
  label: string;
  value: RepeatUnit;
};

export type MonthOrdinalOption = {
  label: string;
  value: MonthOrdinal;
};

export type MonthWeekdayOption = {
  label: string;
  value: MonthWeekday;
};

export type MonthWorkdayOption = {
  label: string;
  value: MonthWorkdayType;
};

export type CustomSlotsConfig = {
  startDate: string;
  endDate: string;
  frequency: number;
  unit: RepeatUnit;
  selectedWeekDays: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  skipWeekends: boolean;
  monthSubMode: MonthSubMode;
  selectedMonthDay: number | "last";
  monthOrdinal: MonthOrdinal;
  monthWeekday: MonthWeekday;
  monthWorkdayType: MonthWorkdayType;
  createAsRange: boolean;
};

export type CustomDateSlotsPopoverProps = {
  onApply?: (config: CustomSlotsConfig) => void;
  trigger?: React.ReactNode;
};

import { generateCustomDateSlots, type GeneratedDateSlot } from "../../utils/generateCustomDateSlots";

type RangeClassification = {
  allSelectedDates: Date[];
  rangeStartDates: Date[];
  rangeMiddleDates: Date[];
  rangeEndDates: Date[];
};

const classifyDateSlots = (slots: GeneratedDateSlot[]): RangeClassification => {
  const allSelectedDates: Date[] = [];
  const rangeStartDates: Date[] = [];
  const rangeMiddleDates: Date[] = [];
  const rangeEndDates: Date[] = [];

  for (const slot of slots) {
    const dayDiff = differenceInCalendarDays(slot.end, slot.start);

    if (dayDiff === 0) {
      allSelectedDates.push(slot.start);
    } else if (dayDiff === 1) {
      rangeStartDates.push(slot.start);
      rangeEndDates.push(slot.end);
      allSelectedDates.push(slot.start, slot.end);
    } else if (dayDiff > 1) {
      rangeStartDates.push(slot.start);
      rangeEndDates.push(slot.end);
      allSelectedDates.push(slot.start, slot.end);

      let current = addDays(slot.start, 1);
      while (current < slot.end) {
        rangeMiddleDates.push(new Date(current));
        allSelectedDates.push(new Date(current));
        current = addDays(current, 1);
      }
    }
  }

  return {
    allSelectedDates,
    rangeStartDates,
    rangeMiddleDates,
    rangeEndDates,
  };
};

const getPresetConfig = (
  preset: PresetType,
  start: Date,
  end: Date,
  dayOfWeek: number,
  dayOfMonth: number,
): CustomSlotsConfig => {
  const baseConfig: CustomSlotsConfig = {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
    frequency: 1,
    unit: "week",
    selectedWeekDays: [dayOfWeek],
    skipWeekends: false,
    monthSubMode: "each",
    selectedMonthDay: dayOfMonth,
    monthOrdinal: "first",
    monthWeekday: "Sunday",
    monthWorkdayType: "first",
    createAsRange: false,
  };

  if (preset === "daily") {
    return { ...baseConfig, unit: "day", frequency: 1, skipWeekends: false };
  }
  if (preset === "weekly") {
    return { ...baseConfig, unit: "week", frequency: 1, selectedWeekDays: [dayOfWeek] };
  }
  if (preset === "monthly") {
    return { ...baseConfig, unit: "month", frequency: 1, monthSubMode: "each", selectedMonthDay: dayOfMonth };
  }
  if (preset === "weekdays") {
    return { ...baseConfig, unit: "week", frequency: 1, selectedWeekDays: [1, 2, 3, 4, 5] };
  }
  if (preset === "weekends") {
    return { ...baseConfig, unit: "week", frequency: 1, selectedWeekDays: [0, 6] };
  }
  return baseConfig;
};

const generatePresetSlots = (
  preset: PresetType,
  start: Date,
  end: Date,
  dayOfWeek: number,
  dayOfMonth: number,
): GeneratedDateSlot[] => {
  const config = getPresetConfig(preset, start, end, dayOfWeek, dayOfMonth);
  return generateCustomDateSlots(config);
};

export const CustomDateSlotsPopover = ({
  onApply,
  trigger,
}: CustomDateSlotsPopoverProps) => {
  const { t, i18n } = usePlanningTranslations();
  const dfLocale = i18n.language?.startsWith("pl") ? pl : enGB;
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"presets" | "custom">("presets");
  const isMobile = useIsMobile();

  // Today's defaults
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const currentDayOfWeek = today.getDay(); // 0 = Sun, 1 = Mon, ...
  const currentDayOfMonth = today.getDate();

  // Custom configuration state (preserved when navigating back and forth)
  const [startDate, setStartDate] = useState<Date>(today);
  const [endDate, setEndDate] = useState<Date>(addMonths(today, 1));
  const [frequency, setFrequency] = useState<number>(1);
  const [unit, setUnit] = useState<RepeatUnit>("week");
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([currentDayOfWeek]);
  const [skipWeekends, setSkipWeekends] = useState<boolean>(false);
  const [monthSubMode, setMonthSubMode] = useState<MonthSubMode>("each");
  const [selectedMonthDay, setSelectedMonthDay] = useState<number | "last">(currentDayOfMonth);
  const [monthOrdinal, setMonthOrdinal] = useState<MonthOrdinal>("first");
  const [monthWeekday, setMonthWeekday] = useState<MonthWeekday>("Sunday");
  const [monthWorkdayType, setMonthWorkdayType] = useState<MonthWorkdayType>("first");
  const [createAsRange, setCreateAsRange] = useState<boolean>(false);

  // Preset selection & preview state
  const [selectedPreset, setSelectedPreset] = useState<PresetType | null>("weekly");
  const [calendarMonth, setCalendarMonth] = useState<Date>(today);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const endDateRef = useRef<HTMLButtonElement>(null);

  const rangeClassification = useMemo<RangeClassification>(() => {
    if (!selectedPreset) {
      return {
        allSelectedDates: [],
        rangeStartDates: [],
        rangeMiddleDates: [],
        rangeEndDates: [],
      };
    }

    let slots: GeneratedDateSlot[] = [];
    if (selectedPreset === "custom") {
      const config: CustomSlotsConfig = {
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
        frequency,
        unit,
        selectedWeekDays,
        skipWeekends,
        monthSubMode,
        selectedMonthDay,
        monthOrdinal,
        monthWeekday,
        monthWorkdayType,
        createAsRange,
      };
      slots = generateCustomDateSlots(config);
    } else {
      slots = generatePresetSlots(selectedPreset, startDate, endDate, currentDayOfWeek, currentDayOfMonth);
    }

    return classifyDateSlots(slots);
  }, [
    selectedPreset,
    startDate,
    endDate,
    frequency,
    unit,
    selectedWeekDays,
    skipWeekends,
    monthSubMode,
    selectedMonthDay,
    monthOrdinal,
    monthWeekday,
    monthWorkdayType,
    createAsRange,
    currentDayOfWeek,
    currentDayOfMonth,
  ]);

  const handleSelectPreset = (preset: PresetType) => {
    setSelectedPreset(preset);

    if (preset === "daily") {
      setUnit("day");
      setFrequency(1);
      setSkipWeekends(false);
    } else if (preset === "weekly") {
      setUnit("week");
      setFrequency(1);
      setSelectedWeekDays([currentDayOfWeek]);
    } else if (preset === "monthly") {
      setUnit("month");
      setFrequency(1);
      setMonthSubMode("each");
      setSelectedMonthDay(currentDayOfMonth);
    } else if (preset === "weekdays") {
      setUnit("week");
      setFrequency(1);
      setSelectedWeekDays([1, 2, 3, 4, 5]);
    } else if (preset === "weekends") {
      setUnit("week");
      setFrequency(1);
      setSelectedWeekDays([0, 6]);
    }
  };

  const handleStartDateChange = (d: Date | undefined) => {
    if (!d) return;
    setStartDate(d);
    setCalendarMonth(d);
    setStartDateOpen(false);
    setEndDateOpen(true);
    setTimeout(() => {
      endDateRef.current?.focus();
    }, 50);
  };

  const handleEndDateChange = (d: Date | undefined) => {
    if (!d) return;
    setEndDate(d);
    setEndDateOpen(false);
  };

  const toggleWeekDay = (dayIndex: number) => {
    setSelectedWeekDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex],
    );
  };

  const handleApply = () => {
    const config: CustomSlotsConfig = {
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      frequency,
      unit,
      selectedWeekDays,
      skipWeekends,
      monthSubMode,
      selectedMonthDay,
      monthOrdinal,
      monthWeekday,
      monthWorkdayType,
      createAsRange,
    };
    onApply?.(config);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const weekDayDefsFull = [
    { label: t("customSlots.custom.daysOfWeekFull.sun"), index: 0 },
    { label: t("customSlots.custom.daysOfWeekFull.mon"), index: 1 },
    { label: t("customSlots.custom.daysOfWeekFull.tue"), index: 2 },
    { label: t("customSlots.custom.daysOfWeekFull.wed"), index: 3 },
    { label: t("customSlots.custom.daysOfWeekFull.thu"), index: 4 },
    { label: t("customSlots.custom.daysOfWeekFull.fri"), index: 5 },
    { label: t("customSlots.custom.daysOfWeekFull.sat"), index: 6 },
  ];
  const fullDayName = weekDayDefsFull.find((d) => d.index === currentDayOfWeek)?.label || "";

  const triggerButton = trigger || (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="h-7 sm:h-9 px-2 sm:px-3 text-[11px] sm:text-xs gap-1.5 font-medium border-border/80 hover:bg-white/5 cursor-pointer"
      title={t("customSlots.triggerTooltip")}
    >
      <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-brand" />
      <span className="hidden sm:inline">{t("customSlots.triggerButton")}</span>
    </Button>
  );

  const content =
    viewMode === "presets" ? (
      /* ── PRESETS VIEW (TWO COLUMNS) ───────────────────────── */
      <div className="flex flex-col gap-3">
        <div className={customSlotsStyles.twoColumnContainer}>
          <CalendarPreview
            selectedDates={rangeClassification.allSelectedDates}
            rangeClassification={rangeClassification}
            calendarMonth={calendarMonth}
            onMonthChange={setCalendarMonth}
            locale={dfLocale}
          />
          <PresetSelector
            selectedPreset={selectedPreset}
            onSelectPreset={handleSelectPreset}
            onOpenCustom={() => {
              setSelectedPreset("custom");
              setViewMode("custom");
            }}
            fullDayName={fullDayName}
            currentDayOfMonth={currentDayOfMonth}
            startDate={startDate}
            endDate={endDate}
            startDateOpen={startDateOpen}
            endDateOpen={endDateOpen}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange}
            setStartDateOpen={setStartDateOpen}
            setEndDateOpen={setEndDateOpen}
            endDateRef={endDateRef}
          />
        </div>

        {/* Footer buttons: Cancel & OK */}
        <div className={customSlotsStyles.footer}>
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            className={customSlotsStyles.cancelButton}
          >
            {t("customSlots.custom.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className={customSlotsStyles.okButton}
          >
            <Check className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
            {t("customSlots.custom.apply")}
          </Button>
        </div>
      </div>
    ) : (
      /* ── CUSTOM REPEAT VIEW ───────────────────────────────── */
      <div className="flex flex-col gap-3">
        <RecurrenceControls
          onBack={() => setViewMode("presets")}
          frequency={frequency}
          setFrequency={setFrequency}
          unit={unit}
          setUnit={setUnit}
          selectedWeekDays={selectedWeekDays}
          toggleWeekDay={toggleWeekDay}
          monthSubMode={monthSubMode}
          setMonthSubMode={setMonthSubMode}
          selectedMonthDay={selectedMonthDay}
          setSelectedMonthDay={setSelectedMonthDay}
          monthOrdinal={monthOrdinal}
          setMonthOrdinal={setMonthOrdinal}
          monthWeekday={monthWeekday}
          setMonthWeekday={setMonthWeekday}
          monthWorkdayType={monthWorkdayType}
          setMonthWorkdayType={setMonthWorkdayType}
          skipWeekends={skipWeekends}
          setSkipWeekends={setSkipWeekends}
          createAsRange={createAsRange}
          setCreateAsRange={setCreateAsRange}
        />

        {/* Footer buttons: Cancel & OK */}
        <div className={customSlotsStyles.footer}>
          <Button
            type="button"
            variant="ghost"
            onClick={handleCancel}
            className={customSlotsStyles.cancelButton}
          >
            {t("customSlots.custom.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className={customSlotsStyles.okButton}
          >
            <Check className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
            {t("customSlots.custom.apply")}
          </Button>
        </div>
      </div>
    );

  if (isMobile) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{triggerButton}</DialogTrigger>
        <DialogContent
          showCloseButton={false}
          className={cn(
            customSlotsStyles.content,
            viewMode === "presets"
              ? customSlotsStyles.contentPresets
              : customSlotsStyles.contentCustom,
            "max-h-[90dvh] overflow-y-auto p-4 sm:p-6",
          )}
        >
          <DialogTitle className="sr-only">{t("customSlots.triggerButton")}</DialogTitle>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className={cn(
          customSlotsStyles.content,
          viewMode === "presets"
            ? customSlotsStyles.contentPresets
            : customSlotsStyles.contentCustom,
        )}
      >
        {content}
      </PopoverContent>
    </Popover>
  );
};

export default CustomDateSlotsPopover;
