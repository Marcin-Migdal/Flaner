import { format, parseISO } from "date-fns";
import { pl, enUS } from "date-fns/locale";
import { CheckCircle, Calendar, Users, RotateCcw } from "lucide-react";
import { Button } from "@flaner/ui-components";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import type { SchedulerEvent } from "../../api/events/types";

export type FinalizedDateCardProps = {
  event: SchedulerEvent;
  isOwner?: boolean;
  onReopen?: () => void;
};

export const FinalizedDateCard = ({ event, isOwner, onReopen }: FinalizedDateCardProps) => {
  const { t, i18n } = usePlanningTranslations();
  const dateLocale = i18n.language === "pl" ? pl : enUS;

  const slotIndex = event.finalizedSlotIndex ?? 0;
  const winningSlot = event.proposedDates[slotIndex];

  if (!winningSlot) return null;

  const startDate = parseISO(winningSlot.start);
  const endDate = parseISO(winningSlot.end);
  const isSameDay = winningSlot.start === winningSlot.end;

  const dateDisplay = isSameDay
    ? format(startDate, "d MMMM yyyy (EEEE)", { locale: dateLocale })
    : `${format(startDate, "d MMMM", { locale: dateLocale })} — ${format(endDate, "d MMMM yyyy", { locale: dateLocale })}`;

  const votes = winningSlot.votes || {};
  const yesVotes = Object.values(votes).filter((v) => v === "yes").length;

  return (
    <div className="w-full relative overflow-hidden rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 p-3.5 backdrop-blur-md shadow-md flex flex-col gap-2 transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>{t("finalizedCard.status")}</span>
        </div>

        <div className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <Users className="w-3.5 h-3.5" />
          <span>{yesVotes}/{event.participants.length}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-0.5">
        <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
        <span className="text-sm sm:text-base font-bold text-foreground tracking-tight">
          {dateDisplay}
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {t("finalizedCard.lockedNotice")}
      </p>

      {isOwner && onReopen && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 w-full border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold text-xs gap-1.5 cursor-pointer"
          onClick={onReopen}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{t("actions.reopenVoting")}</span>
        </Button>
      )}
    </div>
  );
};
