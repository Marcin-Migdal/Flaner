import { useState } from "react";
import { format, parseISO, Locale } from "date-fns";
import { pl, enUS } from "date-fns/locale";
import { Check, CheckCircle2, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
} from "@flaner/ui-components";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import type { SchedulerEvent } from "../../api/events/types";
import type { ParticipantResult } from "../../api/participants";
import { useFinalizeEventMutation } from "../../hooks/api/mutation/useFinalizeEventMutation";

export type FinalizeEventModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: SchedulerEvent;
  participantsProfiles?: ParticipantResult[];
  currentUserId?: string;
};

const formatFinalizeSlotDate = (
  startDate: Date,
  endDate: Date,
  isSameDay: boolean,
  locale: Locale
): string => {
  const cleanDay = (d: string) => d.replace(/\.$/, "");
  const startDay = cleanDay(format(startDate, "EEE", { locale }));

  if (isSameDay) {
    return `${format(startDate, "dd.MM.yyyy")} (${startDay})`;
  }

  const endDay = cleanDay(format(endDate, "EEE", { locale }));
  const isSameYear = startDate.getFullYear() === endDate.getFullYear();

  if (isSameYear) {
    return `${format(startDate, "dd.MM")} (${startDay}) - ${format(endDate, "dd.MM")} (${endDay})`;
  }

  return `${format(startDate, "dd.MM.yyyy")} (${startDay}) - ${format(endDate, "dd.MM.yyyy")} (${endDay})`;
};

export const FinalizeEventModal = ({
  open,
  onOpenChange,
  event,
}: FinalizeEventModalProps) => {
  const { t, i18n } = usePlanningTranslations();
  const dateLocale = i18n.language === "pl" ? pl : enUS;
  const { mutateAsync: finalizeEvent, isPending } = useFinalizeEventMutation();

  // Rank slots by votes
  const slotsWithScores = event.proposedDates.map((slot, originalIndex) => {
    const votes = slot.votes || {};
    const yesCount = Object.values(votes).filter((v) => v === "yes").length;
    const maybeCount = Object.values(votes).filter((v) => v === "maybe").length;
    const totalParticipants = Math.max(1, event.participants.length);
    const score = yesCount * 1.0 + maybeCount * 0.5;
    const matchPercentage = Math.round((yesCount / totalParticipants) * 100);

    return {
      slot,
      originalIndex,
      yesCount,
      maybeCount,
      score,
      matchPercentage,
    };
  });

  const sortedSlots = [...slotsWithScores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.yesCount - a.yesCount;
  });

  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(() => {
    return sortedSlots[0]?.originalIndex ?? 0;
  });

  const handleConfirm = async () => {
    await finalizeEvent({
      eventId: event.id,
      finalizedSlotIndex: selectedSlotIndex,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[562px] w-full max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-card/95 backdrop-blur-xl border border-border shadow-2xl">
        <DialogHeader className="p-5 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>{t("finalizeModal.eyebrow")}</span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground mt-1.5">
            {t("finalizeModal.title")}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {t("finalizeModal.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {sortedSlots.map((item, rankIndex) => {
            const isSelected = selectedSlotIndex === item.originalIndex;
            const isTop = rankIndex === 0;
            const startDate = parseISO(item.slot.start);
            const endDate = parseISO(item.slot.end);

            const isSameDay = item.slot.start === item.slot.end;
            const dateDisplay = formatFinalizeSlotDate(startDate, endDate, isSameDay, dateLocale);

            return (
              <button
                type="button"
                key={item.originalIndex}
                onClick={() => setSelectedSlotIndex(item.originalIndex)}
                className={`w-full text-left relative group flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-primary/10 border-primary ring-2 ring-primary/40 shadow-sm"
                    : "bg-background/60 hover:bg-accent/40 border-border/60"
                }`}
              >
                {/* Left: Trophy icon on the far left across the row height */}
                {isTop && (
                  <div className="shrink-0 self-stretch flex items-center justify-center pr-0.5 text-amber-500">
                    <Trophy className="w-5 h-5 text-amber-500" />
                  </div>
                )}

                {/* Right: Info row + Progress bar */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-5 h-5 shrink-0 rounded-full flex items-center justify-center border transition-colors ${
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/40 group-hover:border-muted-foreground"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <span className="font-semibold text-sm text-foreground truncate">
                        {dateDisplay}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="px-2 py-0.5 rounded-md bg-muted/60 text-xs font-semibold text-foreground flex items-center gap-1">
                        <span className="text-emerald-500 font-bold">✓ {item.yesCount}</span>
                        {item.maybeCount > 0 && (
                          <span className="text-amber-500 font-medium">? {item.maybeCount}</span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-primary">
                        {item.matchPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar of votes */}
                  <div className="w-full bg-muted/40 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${item.matchPercentage}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-border/40 bg-muted/20 flex flex-row items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("actions.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleConfirm}
            disabled={isPending || selectedSlotIndex === null}
            isBusy={isPending}
            className="gap-1.5 font-semibold"
          >
            <Check className="w-4 h-4 stroke-[2.5]" />
            {isPending ? t("actions.saving") : t("finalizeModal.confirmButton")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
