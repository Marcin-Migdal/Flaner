import { CheckCircle } from "lucide-react";
import { getSlotKey, type ProposedDateSlot } from "../../../../api/events/types";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import {
  gridWinnerCellVariants,
  gridWinnerFirstColStyles,
} from "./AvailabilityGridWinnerHeader.styles";

export type AvailabilityGridWinnerHeaderProps = {
  proposedDates: ProposedDateSlot[];
  finalizedSlotKey?: string;
  gridTemplateColumns: string;
};

export const AvailabilityGridWinnerHeader = ({
  proposedDates,
  finalizedSlotKey,
  gridTemplateColumns,
}: AvailabilityGridWinnerHeaderProps) => {
  const { t } = usePlanningTranslations();

  return (
    <div
      className="grid border-b border-border/60 bg-success/10"
      style={{ gridTemplateColumns }}
    >
      <div className={gridWinnerFirstColStyles}>
        <div className="absolute inset-0 bg-success/10 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5 text-success-text shrink-0" />
          <span>{t("grid.status")}</span>
        </div>
      </div>
      {proposedDates.map((slot, slotIdx) => {
        const isWinning = finalizedSlotKey === getSlotKey(slot);
        return (
          <div
            key={slotIdx}
            className={gridWinnerCellVariants({ isWinning })}
          >
            {isWinning ? (
              <span className="px-2 py-0.5 rounded-full text-4xs font-bold bg-success text-success-foreground uppercase tracking-wide leading-none shadow-sm">
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
