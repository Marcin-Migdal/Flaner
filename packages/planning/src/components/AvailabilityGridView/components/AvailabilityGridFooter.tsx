import { Trophy } from "lucide-react";
import type { ProposedDateSlot } from "../../../api/events/types";
import { usePlanningTranslations } from "../../../hooks/usePlanningTranslations";
import type { SlotStat } from "../types";
import {
  gridFooterCellVariants,
  gridFooterFirstColStyles,
} from "./AvailabilityGridFooter.styles";

export type AvailabilityGridFooterProps = {
  proposedDates: ProposedDateSlot[];
  slotStats: SlotStat[];
  maxScore: number;
  participantsCount: number;
  gridTemplateColumns: string;
};

export const AvailabilityGridFooter = ({
  proposedDates,
  slotStats,
  maxScore,
  participantsCount,
  gridTemplateColumns,
}: AvailabilityGridFooterProps) => {
  const { t } = usePlanningTranslations();

  return (
    <div
      className="grid border-t-2 border-border/80 bg-muted/60 font-semibold text-xs"
      style={{ gridTemplateColumns }}
    >
      {/* Bottom-Left Corner Cell (Sticky) */}
      <div className={gridFooterFirstColStyles}>
        <div className="absolute inset-0 bg-muted/60 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span>{t("grid.matchRate")}</span>
        </div>
      </div>

      {proposedDates.map((_, slotIdx) => {
        const stat = slotStats[slotIdx];
        const isTop = stat && stat.score > 0 && stat.score === maxScore;

        return (
          <div
            key={slotIdx}
            className={gridFooterCellVariants({ highlight: isTop ? "top" : "none" })}
          >
            <span
              className={`text-sm font-bold transition-colors duration-300 ease-in-out ${isTop ? "text-amber-500" : "text-foreground"}`}
            >
              {stat.matchPercentage}%
            </span>
            <span className="text-[10px] text-muted-foreground">
              {stat.yesCount}/{participantsCount} {t("grid.available")}
            </span>
          </div>
        );
      })}
    </div>
  );
};

