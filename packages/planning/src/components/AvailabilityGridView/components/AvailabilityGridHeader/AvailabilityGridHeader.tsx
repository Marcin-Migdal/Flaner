import { format, parseISO } from "date-fns";
import { Trophy, Users } from "lucide-react";
import { getSlotKey, type ProposedDateSlot } from "../../../../api/events/types";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { isSameDaySlot, type RankedSlot } from "../../../../utils/slotRanking";
import {
  gridHeaderCellVariants,
  gridHeaderFirstColStyles,
} from "./AvailabilityGridHeader.styles";

export type AvailabilityGridHeaderProps = {
  proposedDates: ProposedDateSlot[];
  participantsCount: number;
  slotStats: RankedSlot[];
  isFinalized?: boolean;
  finalizedSlotKey?: string;
  gridTemplateColumns: string;
};

export const AvailabilityGridHeader = ({
  proposedDates,
  participantsCount,
  slotStats,
  isFinalized,
  finalizedSlotKey,
  gridTemplateColumns,
}: AvailabilityGridHeaderProps) => {
  const { t } = usePlanningTranslations();

  return (
    <div
      className="grid border-b border-border/60 bg-muted/40"
      style={{ gridTemplateColumns }}
    >
      {/* Top-Left Corner Cell (Sticky) */}
      <div className={gridHeaderFirstColStyles}>
        <div className="absolute inset-0 bg-muted/40 pointer-events-none" />
        <div className="relative z-10 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span>
            {t("grid.participants")} ({participantsCount})
          </span>
        </div>
      </div>

      {/* Slot Column Headers */}
      {proposedDates.map((slot, slotIdx) => {
        const startDate = parseISO(slot.start);
        const endDate = parseISO(slot.end);
        const isSameDay = isSameDaySlot(slot);
        const stat = slotStats[slotIdx];
        const isTop = stat.isTop;
        const isWinning = isFinalized && finalizedSlotKey === getSlotKey(slot);
        const highlight = isWinning ? "winning" : isTop ? "top" : "none";

        const dateDisplay = isSameDay
          ? format(startDate, "dd.MM")
          : `${format(startDate, "dd.MM")} - ${format(endDate, "dd.MM")}`;

        return (
          <div
            key={slotIdx}
            className={gridHeaderCellVariants({ highlight })}
          >
            <span className="text-xs font-bold text-foreground truncate max-w-full">{dateDisplay}</span>

            <div className="flex items-center justify-center gap-1 text-3xs sm:text-2xs font-semibold text-muted-foreground">
              {isTop && !isFinalized ? <Trophy className="w-3 h-3 text-warning-text shrink-0" /> : null}
              <span className="text-success-text font-bold">✓{stat.tally.yes.length}</span>
              {stat.tally.maybe.length > 0 && <span className="text-warning-text">?{stat.tally.maybe.length}</span>}
              <span className="text-primary font-bold">({stat.matchPercentage}%)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AvailabilityGridHeader;
