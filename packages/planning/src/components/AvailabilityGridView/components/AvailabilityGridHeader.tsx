import { format, parseISO } from "date-fns";
import { Trophy, Users } from "lucide-react";
import type { ProposedDateSlot } from "../../../api/events/types";
import { usePlanningTranslations } from "../../../hooks/usePlanningTranslations";
import type { SlotStat } from "../types";

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

        const dateDisplay = isSameDay
          ? format(startDate, "dd.MM")
          : `${format(startDate, "dd.MM")} - ${format(endDate, "dd.MM")}`;

        return (
          <div
            key={slotIdx}
            className={`px-1.5 py-2 flex flex-col items-center justify-center text-center gap-1 border-r border-border/50 last:border-r-0 transition-colors duration-300 ease-in-out ${
              isWinning ? "bg-emerald-500/15" : isTop ? "bg-amber-500/10" : ""
            }`}
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
