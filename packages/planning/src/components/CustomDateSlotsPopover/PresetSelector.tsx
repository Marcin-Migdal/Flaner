import React from "react";
import { Check, ChevronRight } from "lucide-react";
import { DatePicker } from "@flaner/ui-components";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { customSlotsStyles, presetItemVariants } from "./CustomDateSlotsPopover.styles";
import type { PresetType } from "./CustomDateSlotsPopover";

const getOrdinalSuffix = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

export type PresetSelectorProps = {
  selectedPreset: PresetType | null;
  onSelectPreset: (preset: PresetType) => void;
  onOpenCustom: () => void;
  fullDayName: string;
  currentDayOfMonth: number;
  startDate: Date;
  endDate: Date;
  startDateOpen: boolean;
  endDateOpen: boolean;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  setStartDateOpen: (open: boolean) => void;
  setEndDateOpen: (open: boolean) => void;
  endDateRef: React.RefObject<HTMLButtonElement | null>;
};

export const PresetSelector = ({
  selectedPreset,
  onSelectPreset,
  onOpenCustom,
  fullDayName,
  currentDayOfMonth,
  startDate,
  endDate,
  startDateOpen,
  endDateOpen,
  onStartDateChange,
  onEndDateChange,
  setStartDateOpen,
  setEndDateOpen,
  endDateRef,
}: PresetSelectorProps) => {
  const { t } = usePlanningTranslations();

  return (
    <div className={customSlotsStyles.optionsColumn}>
      <div className={customSlotsStyles.presetList}>
        <button
          type="button"
          className={presetItemVariants({ isCustom: false, active: selectedPreset === "daily" })}
          onClick={() => onSelectPreset("daily")}
        >
          <span>{t("customSlots.presets.daily")}</span>
          {selectedPreset === "daily" && <Check className="h-3.5 w-3.5 text-brand" />}
        </button>

        <button
          type="button"
          className={presetItemVariants({ isCustom: false, active: selectedPreset === "weekly" })}
          onClick={() => onSelectPreset("weekly")}
        >
          <span>{t("customSlots.presets.weeklyWithDay", { day: fullDayName })}</span>
          {selectedPreset === "weekly" && <Check className="h-3.5 w-3.5 text-brand" />}
        </button>

        <button
          type="button"
          className={presetItemVariants({ isCustom: false, active: selectedPreset === "monthly" })}
          onClick={() => onSelectPreset("monthly")}
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
          onClick={() => onSelectPreset("weekdays")}
        >
          <span>{t("customSlots.presets.weekdays")}</span>
          {selectedPreset === "weekdays" && <Check className="h-3.5 w-3.5 text-brand" />}
        </button>

        <button
          type="button"
          className={presetItemVariants({ isCustom: false, active: selectedPreset === "weekends" })}
          onClick={() => onSelectPreset("weekends")}
        >
          <span>{t("customSlots.presets.weekends")}</span>
          {selectedPreset === "weekends" && <Check className="h-3.5 w-3.5 text-brand" />}
        </button>

        <div className={customSlotsStyles.divider} />

        <button
          type="button"
          className={presetItemVariants({ isCustom: true, active: selectedPreset === "custom" })}
          onClick={onOpenCustom}
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
              onChange={onStartDateChange}
              open={startDateOpen}
              onOpenChange={setStartDateOpen}
              dateFormat="dd.MM.yyyy"
              className="w-full [&_button]:px-2 [&_button]:h-8 [&_button]:text-xs [&_button]:font-medium [&_svg]:size-3.5 [&_svg]:mr-1.5"
            />
            <DatePicker
              ref={endDateRef}
              value={endDate}
              onChange={onEndDateChange}
              open={endDateOpen}
              onOpenChange={setEndDateOpen}
              dateFormat="dd.MM.yyyy"
              className="w-full [&_button]:px-2 [&_button]:h-8 [&_button]:text-xs [&_button]:font-medium [&_svg]:size-3.5 [&_svg]:mr-1.5"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresetSelector;
