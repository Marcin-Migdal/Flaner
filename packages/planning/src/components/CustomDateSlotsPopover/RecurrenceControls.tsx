import { ArrowLeft } from "lucide-react";
import { Checkbox, Select, Switch, TextField } from "@flaner/ui-components";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import {
  customSlotsStyles,
  monthDayCellVariants,
  monthTabButtonVariants,
  weekdayCircleVariants,
} from "./CustomDateSlotsPopover.styles";
import type {
  MonthOrdinal,
  MonthOrdinalOption,
  MonthSubMode,
  MonthWeekday,
  MonthWeekdayOption,
  MonthWorkdayOption,
  MonthWorkdayType,
  RepeatUnit,
  UnitOption,
} from "./CustomDateSlotsPopover";

export type RecurrenceControlsProps = {
  onBack: () => void;
  frequency: number;
  setFrequency: (val: number) => void;
  unit: RepeatUnit;
  setUnit: (u: RepeatUnit) => void;
  selectedWeekDays: number[];
  toggleWeekDay: (dayIndex: number) => void;
  monthSubMode: MonthSubMode;
  setMonthSubMode: (mode: MonthSubMode) => void;
  selectedMonthDay: number | "last";
  setSelectedMonthDay: (day: number | "last") => void;
  monthOrdinal: MonthOrdinal;
  setMonthOrdinal: (ord: MonthOrdinal) => void;
  monthWeekday: MonthWeekday;
  setMonthWeekday: (w: MonthWeekday) => void;
  monthWorkdayType: MonthWorkdayType;
  setMonthWorkdayType: (wt: MonthWorkdayType) => void;
  skipWeekends: boolean;
  setSkipWeekends: (skip: boolean) => void;
  createAsRange: boolean;
  setCreateAsRange: (range: boolean) => void;
};

export const RecurrenceControls = ({
  onBack,
  frequency,
  setFrequency,
  unit,
  setUnit,
  selectedWeekDays,
  toggleWeekDay,
  monthSubMode,
  setMonthSubMode,
  selectedMonthDay,
  setSelectedMonthDay,
  monthOrdinal,
  setMonthOrdinal,
  monthWeekday,
  setMonthWeekday,
  monthWorkdayType,
  setMonthWorkdayType,
  skipWeekends,
  setSkipWeekends,
  createAsRange,
  setCreateAsRange,
}: RecurrenceControlsProps) => {
  const { t } = usePlanningTranslations();

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

  return (
    <>
      {/* Header with Back button */}
      <div className={customSlotsStyles.header}>
        <button
          type="button"
          className={customSlotsStyles.backButton}
          onClick={onBack}
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

      {/* Sub-panel for Week */}
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

      {/* Sub-panel for Month */}
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
    </>
  );
};

export default RecurrenceControls;
