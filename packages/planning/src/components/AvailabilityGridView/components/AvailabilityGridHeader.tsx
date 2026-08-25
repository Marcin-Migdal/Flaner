import { format, parseISO } from "date-fns";
import { Trophy, Users } from "lucide-react";
import type { ProposedDateSlot } from "../../../api/events/types";
import { usePlanningTranslations } from "../../../hooks/usePlanningTranslations";
import type { SlotStat } from "../types";
import { gridSlotCellVariants } from "./AvailabilityGridCell.styles";

export type AvailabilityGridHeaderProps = {
  proposedDates: ProposedDateSlot[];
  participantsCount: number;
  slotStats: SlotStat[];
  maxScore: number;
  isFinalized?: boolean;
  finalizedSlotIndex?: number;
  gridTemplateColumns: string;
};

export const AvailabilityGridHeader = ({
  proposedDates,
  participantsCount,
  slotStats,
  maxScore,
  isFinalized,
  finalizedSlotIndex,
  gridTemplateColumns,
}: AvailabilityGridHeaderProps) => {
  const { t } = usePlanningTranslations();

  return (
    <div
      className="grid border-b border-border/60 bg-muted/40"
      style={{ gridTemplateColumns }}
    >
      {/* Top-Left Corner Cell */}
      <div className="p-2.5 sm:p-3 flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-muted-foreground border-r border-border/50">
        <Users className="w-4 h-4 text-primary" />
        <span>
          {t("grid.participants")} ({participantsCount})
        </span>
      </div>

      {/* Slot Column Headers */}
      {proposedDates.map((slot, slotIdx) => {
        const startDate = parseISO(slot.start);
        const endDate = parseISO(slot.end);
        const isSameDay = slot.start === slot.end;
        const stat = slotStats[slotIdx];
        const isTop = stat && stat.score > 0 && stat.score === maxScore;
        const isWinning = isFinalized && finalizedSlotIndex === slotIdx;
        const highlight = isWinning ? "winning" : isTop ? "top" : "none";

        const dateDisplay = isSameDay
          ? format(startDate, "dd.MM")
          : `${format(startDate, "dd.MM")} - ${format(endDate, "dd.MM")}`;

        return (
          <div
            key={slotIdx}
            className={gridSlotCellVariants({ highlight })}
          >
            <span className="text-xs font-bold text-foreground truncate max-w-full">{dateDisplay}</span>

            <div className="flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-semibold text-muted-foreground">
              {isTop && !isFinalized ? <Trophy className="w-3 h-3 text-amber-500 shrink-0" /> : null}
              <span className="text-emerald-500 font-bold">✓{stat.yesCount}</span>
              {stat.maybeCount > 0 && <span className="text-amber-500">?{stat.maybeCount}</span>}
              <span className="text-primary font-bold">({stat.matchPercentage}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

