import { Trophy } from "lucide-react";
import type { ProposedDateSlot } from "../../../api/events/types";
import { usePlanningTranslations } from "../../../hooks/usePlanningTranslations";
import type { SlotStat } from "../types";

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
      <div className="p-2.5 sm:p-3 flex items-center gap-1.5 text-foreground border-r border-border/50 font-bold">
        <Trophy className="w-4 h-4 text-amber-500" />
        <span>{t("grid.matchRate")}</span>
      </div>

      {proposedDates.map((_, slotIdx) => {
        const stat = slotStats[slotIdx];
        const isTop = stat && stat.score > 0 && stat.score === maxScore;

        return (
          <div
            key={slotIdx}
            className={`px-1.5 py-2 flex flex-col items-center justify-center text-center gap-0.5 border-r border-border/50 last:border-r-0 transition-colors duration-300 ease-in-out ${
              isTop ? "bg-amber-500/15" : ""
            }`}
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
