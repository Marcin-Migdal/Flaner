import React, { useState, useMemo, useRef } from "react";
import { format, addMonths, differenceInCalendarDays, addDays } from "date-fns";
import { pl, enGB } from "date-fns/locale";
import { ArrowLeft, Layers, Check, ChevronRight } from "lucide-react";
import {
  Button,
  Calendar,
  DatePicker,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  Switch,
  TextField,
  Select,
  Checkbox,
} from "@flaner/ui-components";
import { cn } from "@flaner/shared/utils";
import { useIsMobile } from "@flaner/shared/hooks";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import {
  customSlotsStyles,
  presetItemVariants,
  weekdayCircleVariants,
  monthDayCellVariants,
  monthTabButtonVariants,
} from "./CustomDateSlotsPopover.styles";

export type RepeatUnit = "day" | "week" | "month";
export type MonthSubMode = "each" | "onThe" | "workday";
export type MonthOrdinal = "first" | "second" | "third" | "fourth" | "fifth" | "last";
export type MonthWeekday = "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
export type MonthWorkdayType = "first" | "last";
export type PresetType = "daily" | "weekly" | "monthly" | "weekdays" | "weekends" | "custom";

type UnitOption = {
  label: string;
  value: RepeatUnit;
};

type MonthOrdinalOption = {
  label: string;
  value: MonthOrdinal;
};

type MonthWeekdayOption = {
  label: string;
  value: MonthWeekday;
};

type MonthWorkdayOption = {
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

const getOrdinalSuffix = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
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
  const today = new Date();
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

  const weekDayDefs = [
    { label: t("customSlots.custom.daysOfWeek.mon"), index: 1 },
    { label: t("customSlots.custom.daysOfWeek.tue"), index: 2 },
    { label: t("customSlots.custom.daysOfWeek.wed"), index: 3 },
    { label: t("customSlots.custom.daysOfWeek.thu"), index: 4 },
    { label: t("customSlots.custom.daysOfWeek.fri"), index: 5 },
    { label: t("customSlots.custom.daysOfWeek.sat"), index: 6 },
    { label: t("customSlots.custom.daysOfWeek.sun"), index: 0 },
  ];

  const monthDayNumbers = Array.from({ length: 31 }, (_, i) => i + 1);

  const unitOptions: UnitOption[] = [
    {
      label: frequency > 1 ? t("customSlots.custom.units.days") : t("customSlots.custom.units.day"),
      value: "day",
    },
    {
      label: frequency > 1 ? t("customSlots.custom.units.weeks") : t("customSlots.custom.units.week"),
      value: "week",
    },
    {
      label: frequency > 1 ? t("customSlots.custom.units.months") : t("customSlots.custom.units.month"),
      value: "month",
    },
  ];

  const monthOrdinalOptions: MonthOrdinalOption[] = [
    { label: t("customSlots.custom.ordinals.first"), value: "first" },
    { label: t("customSlots.custom.ordinals.second"), value: "second" },
    { label: t("customSlots.custom.ordinals.third"), value: "third" },
    { label: t("customSlots.custom.ordinals.fourth"), value: "fourth" },
    { label: t("customSlots.custom.ordinals.fifth"), value: "fifth" },
    { label: t("customSlots.custom.ordinals.last"), value: "last" },
  ];

  const monthWeekdayOptions: MonthWeekdayOption[] = [
    { label: t("customSlots.custom.daysOfWeekFull.mon"), value: "Monday" },
    { label: t("customSlots.custom.daysOfWeekFull.tue"), value: "Tuesday" },
    { label: t("customSlots.custom.daysOfWeekFull.wed"), value: "Wednesday" },
    { label: t("customSlots.custom.daysOfWeekFull.thu"), value: "Thursday" },
    { label: t("customSlots.custom.daysOfWeekFull.fri"), value: "Friday" },
    { label: t("customSlots.custom.daysOfWeekFull.sat"), value: "Saturday" },
    { label: t("customSlots.custom.daysOfWeekFull.sun"), value: "Sunday" },
  ];

  const monthWorkdayOptions: MonthWorkdayOption[] = [
    { label: t("customSlots.custom.workdays.first"), value: "first" },
    { label: t("customSlots.custom.workdays.last"), value: "last" },
  ];

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

  const content = viewMode === "presets" ? (
          /* ── PRESETS VIEW (TWO COLUMNS) ───────────────────────── */
          <div className="flex flex-col gap-3">
            <div className={customSlotsStyles.twoColumnContainer}>
              {/* Left Column: Mini Calendar Preview */}
              <div className={customSlotsStyles.calendarColumn}>
                <Calendar
                  mode="multiple"
                  selected={rangeClassification.allSelectedDates}
                  onSelect={() => {}}
                  modifiers={{
                    range_start: rangeClassification.rangeStartDates,
                    range_middle: rangeClassification.rangeMiddleDates,
                    range_end: rangeClassification.rangeEndDates,
                  }}
                  classNames={{
                    range_start: "rounded-l-(--cell-radius) bg-primary after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-primary",
                    range_middle: "rounded-none bg-primary",
                    range_end: "rounded-r-(--cell-radius) bg-primary after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-primary",
                  }}
                  modifiersClassNames={{
                    range_start: "[&_button]:!rounded-l-(--cell-radius) [&_button]:!rounded-r-none [&_button]:!bg-primary [&_button]:!text-primary-foreground",
                    range_middle: "[&_button]:!rounded-none [&_button]:!bg-primary [&_button]:!text-primary-foreground",
                    range_end: "[&_button]:!rounded-r-(--cell-radius) [&_button]:!rounded-l-none [&_button]:!bg-primary [&_button]:!text-primary-foreground",
                  }}
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  locale={dfLocale}
                  weekStartsOn={1}
                  className="p-0 [&_button[data-day]]:pointer-events-none [&_button[data-day]]:cursor-default"
                />
              </div>

              {/* Right Column: Presets & Date Range */}
              <div className={customSlotsStyles.optionsColumn}>
                <div className={customSlotsStyles.presetList}>
                  <button
                    type="button"
                    className={presetItemVariants({ isCustom: false, active: selectedPreset === "daily" })}
                    onClick={() => handleSelectPreset("daily")}
                  >
                    <span>{t("customSlots.presets.daily")}</span>
                    {selectedPreset === "daily" && <Check className="h-3.5 w-3.5 text-brand" />}
                  </button>

                  <button
                    type="button"
                    className={presetItemVariants({ isCustom: false, active: selectedPreset === "weekly" })}
                    onClick={() => handleSelectPreset("weekly")}
                  >
                    <span>
                      {t("customSlots.presets.weeklyWithDay", { day: fullDayName })}
                    </span>
                    {selectedPreset === "weekly" && <Check className="h-3.5 w-3.5 text-brand" />}
                  </button>

                  <button
                    type="button"
                    className={presetItemVariants({ isCustom: false, active: selectedPreset === "monthly" })}
                    onClick={() => handleSelectPreset("monthly")}
                  >
                    <span>
                      {t("customSlots.presets.monthlyWithDay", {
                        day: getOrdinalSuffix(currentDayOfMonth),
                      })}
                    </span>
                    {selectedPreset === "monthly" && <Check className="h-3.5 w-3.5 text-brand" />}
                  </button>

                  <div className={customSlotsStyles.divider} />

                  <button
                    type="button"
                    className={presetItemVariants({ isCustom: false, active: selectedPreset === "weekdays" })}
                    onClick={() => handleSelectPreset("weekdays")}
                  >
                    <span>{t("customSlots.presets.weekdays")}</span>
                    {selectedPreset === "weekdays" && <Check className="h-3.5 w-3.5 text-brand" />}
                  </button>

                  <button
                    type="button"
                    className={presetItemVariants({ isCustom: false, active: selectedPreset === "weekends" })}
                    onClick={() => handleSelectPreset("weekends")}
                  >
                    <span>{t("customSlots.presets.weekends")}</span>
                    {selectedPreset === "weekends" && <Check className="h-3.5 w-3.5 text-brand" />}
                  </button>

                  <div className={customSlotsStyles.divider} />

                  <button
                    type="button"
                    className={presetItemVariants({ isCustom: true, active: selectedPreset === "custom" })}
                    onClick={() => {
                      setSelectedPreset("custom");
                      setViewMode("custom");
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{t("customSlots.presets.custom")}</span>
                      {selectedPreset === "custom" && <Check className="h-3.5 w-3.5 text-brand" />}
                    </div>
                    <ChevronRight className="h-4 w-4 text-brand/80" />
                  </button>

                  <div className={customSlotsStyles.divider} />

                  {/* Date Range Section: Od - Do */}
                  <div className={customSlotsStyles.section}>
                    <span className={customSlotsStyles.sectionLabel}>
                      {t("customSlots.custom.dateRange")}
                    </span>
                    <div className={customSlotsStyles.dateRangeRow}>
                      <DatePicker
                        value={startDate}
                        onChange={handleStartDateChange}
                        open={startDateOpen}
                        onOpenChange={setStartDateOpen}
                        dateFormat="dd.MM.yyyy"
                        className="w-full [&_button]:px-2 [&_button]:h-8 [&_button]:text-xs [&_button]:font-medium [&_svg]:size-3.5 [&_svg]:mr-1.5"
                      />
                      <DatePicker
                        ref={endDateRef}
                        value={endDate}
                        onChange={handleEndDateChange}
                        open={endDateOpen}
                        onOpenChange={setEndDateOpen}
                        dateFormat="dd.MM.yyyy"
                        className="w-full [&_button]:px-2 [&_button]:h-8 [&_button]:text-xs [&_button]:font-medium [&_svg]:size-3.5 [&_svg]:mr-1.5"
                      />
                    </div>
                  </div>
                </div>
              </div>
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
            {/* Header with Back button */}
            <div className={customSlotsStyles.header}>
              <button
                type="button"
                className={customSlotsStyles.backButton}
                onClick={() => setViewMode("presets")}
                title={t("customSlots.custom.back")}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <span className={customSlotsStyles.title}>
                {t("customSlots.custom.title")}
              </span>
            </div>

            {/* Every [ X ] [ Unit ] Row */}
            <div className={customSlotsStyles.everyRow}>
              <span className={customSlotsStyles.everyLabel}>
                {t("customSlots.custom.every")}
              </span>
              <TextField
                type="number"
                min={1}
                max={99}
                value={frequency}
                onChange={(e) => setFrequency(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-20 shrink-0"
              />
              <Select<UnitOption>
                options={unitOptions}
                value={unitOptions.find((opt) => opt.value === unit)}
                onChange={(selected) => {
                  if (selected) setUnit(selected.value);
                }}
                isSearchable={false}
                containerClassName="flex-1 min-w-0"
              />
            </div>

            {/* ── Sub-panel for Week ────────────────────────────── */}
            {unit === "week" && (
              <div className={customSlotsStyles.weekDaysRow}>
                {weekDayDefs.map((day) => {
                  const isActive = selectedWeekDays.includes(day.index);
                  return (
                    <button
                      key={day.index}
                      type="button"
                      className={weekdayCircleVariants({ active: isActive })}
                      onClick={() => toggleWeekDay(day.index)}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Sub-panel for Month ───────────────────────────── */}
            {unit === "month" && (
              <div className="flex flex-col gap-2.5">
                {/* Segmented Control Tabs */}
                <div className={customSlotsStyles.monthTabsContainer}>
                  <button
                    type="button"
                    className={monthTabButtonVariants({ active: monthSubMode === "each" })}
                    onClick={() => setMonthSubMode("each")}
                  >
                    {t("customSlots.custom.monthModes.each")}
                  </button>
                  <button
                    type="button"
                    className={monthTabButtonVariants({ active: monthSubMode === "onThe" })}
                    onClick={() => setMonthSubMode("onThe")}
                  >
                    {t("customSlots.custom.monthModes.onThe")}
                  </button>
                  <button
                    type="button"
                    className={monthTabButtonVariants({ active: monthSubMode === "workday" })}
                    onClick={() => setMonthSubMode("workday")}
                  >
                    {t("customSlots.custom.monthModes.workday")}
                  </button>
                </div>

                {/* Sub-mode: Each (1..31 + Last Day grid) */}
                {monthSubMode === "each" && (
                  <div className={customSlotsStyles.monthDaysGrid}>
                    {monthDayNumbers.map((num) => (
                      <button
                        key={num}
                        type="button"
                        className={monthDayCellVariants({
                          active: selectedMonthDay === num,
                          isLastDay: false,
                        })}
                        onClick={() => setSelectedMonthDay(num)}
                      >
                        {num}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={monthDayCellVariants({
                        active: selectedMonthDay === "last",
                        isLastDay: true,
                      })}
                      onClick={() => setSelectedMonthDay("last")}
                    >
                      {t("customSlots.custom.lastDay")}
                    </button>
                  </div>
                )}

                {/* Sub-mode: On the (ordinal + weekday selects) */}
                {monthSubMode === "onThe" && (
                  <div className={customSlotsStyles.monthSelectsRow}>
                    <Select<MonthOrdinalOption>
                      options={monthOrdinalOptions}
                      value={monthOrdinalOptions.find((opt) => opt.value === monthOrdinal)}
                      onChange={(selected) => {
                        if (selected) setMonthOrdinal(selected.value);
                      }}
                      isSearchable={false}
                    />
                    <Select<MonthWeekdayOption>
                      options={monthWeekdayOptions}
                      value={monthWeekdayOptions.find((opt) => opt.value === monthWeekday)}
                      onChange={(selected) => {
                        if (selected) setMonthWeekday(selected.value);
                      }}
                      isSearchable={false}
                    />
                  </div>
                )}

                {/* Sub-mode: Workday (first / last workday) */}
                {monthSubMode === "workday" && (
                  <div>
                    <Select<MonthWorkdayOption>
                      options={monthWorkdayOptions}
                      value={monthWorkdayOptions.find((opt) => opt.value === monthWorkdayType)}
                      onChange={(selected) => {
                        if (selected) setMonthWorkdayType(selected.value);
                      }}
                      isSearchable={false}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Options Section: Checkboxes & Switches */}
            <div className={customSlotsStyles.optionsSection}>
              {(unit === "day" || (unit === "month" && monthSubMode === "each")) && (
                <Checkbox
                  checked={skipWeekends}
                  onCheckedChange={(checked) => setSkipWeekends(checked === true)}
                  label={t("customSlots.custom.skipWeekends")}
                />
              )}
              <Switch
                checked={createAsRange}
                onChange={(e) => setCreateAsRange(e.target.checked)}
                label={t("customSlots.custom.createAsRange")}
                description={t("customSlots.custom.createAsRangeDesc")}
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
