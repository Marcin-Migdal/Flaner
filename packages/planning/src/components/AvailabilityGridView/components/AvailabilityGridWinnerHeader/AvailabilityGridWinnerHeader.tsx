import { CheckCircle } from "lucide-react";
import type { ProposedDateSlot } from "../../../../api/events/types";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import {
  gridWinnerCellVariants,
  gridWinnerFirstColStyles,
} from "./AvailabilityGridWinnerHeader.styles";

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
      <div className={gridWinnerFirstColStyles}>
        <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>{t("grid.status")}</span>
        </div>
      </div>
      {proposedDates.map((_, slotIdx) => {
        const isWinning = finalizedSlotIndex === slotIdx;
        return (
          <div
            key={slotIdx}
            className={gridWinnerCellVariants({ isWinning })}
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

export default AvailabilityGridWinnerHeader;
