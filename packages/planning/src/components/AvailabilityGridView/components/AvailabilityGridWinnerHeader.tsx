import { CheckCircle } from "lucide-react";
import type { ProposedDateSlot } from "../../../api/events/types";
import { usePlanningTranslations } from "../../../hooks/usePlanningTranslations";
import { gridSlotCellVariants } from "./AvailabilityGridCell.styles";

export type AvailabilityGridWinnerHeaderProps = {
  proposedDates: ProposedDateSlot[];
  finalizedSlotIndex?: number;
  gridTemplateColumns: string;
};

export const AvailabilityGridWinnerHeader = ({
  proposedDates,
  finalizedSlotIndex,
  gridTemplateColumns,
}: AvailabilityGridWinnerHeaderProps) => {
  const { t } = usePlanningTranslations();

  return (
    <div
      className="grid border-b border-border/60 bg-emerald-500/10"
      style={{ gridTemplateColumns }}
    >
      <div className="p-2 sm:px-3 flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border-r border-border/50">
        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span>{t("grid.status")}</span>
      </div>
      {proposedDates.map((_, slotIdx) => {
        const isWinning = finalizedSlotIndex === slotIdx;
        return (
          <div
            key={slotIdx}
            className={gridSlotCellVariants({ highlight: isWinning ? "winning" : "none" })}
          >
            {isWinning ? (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-emerald-950 uppercase tracking-wide leading-none shadow-sm">
                {t("grid.winner")}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

