import { useState } from "react";
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
import {
  finalizeSlotItemVariants,
  finalizeCheckRadioVariants,
} from "./FinalizeEventModal.styles";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import type { SchedulerEvent } from "../../api/events/types";
import type { ParticipantResult } from "../../api/participants";
import { useFinalizeEventMutation } from "../../hooks/api/mutation/useFinalizeEventMutation";
import { formatSlotDate } from "../../utils/formatSlotDate";
import { rankSlots } from "../../utils/slotRanking";

export type FinalizeEventModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: SchedulerEvent;
  participantsProfiles?: ParticipantResult[];
  currentUserId?: string;
};

export const FinalizeEventModal = ({
  open,
  onOpenChange,
  event,
}: FinalizeEventModalProps) => {
  const { t, i18n } = usePlanningTranslations();
  const dateLocale = i18n.language === "pl" ? pl : enUS;
  const { mutateAsync: finalizeEvent, isPending } = useFinalizeEventMutation();

  const { ranked } = rankSlots(event);

  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(() => {
    return ranked[0]?.slotIndex ?? 0;
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
          {ranked.map((item) => {
            const isSelected = selectedSlotIndex === item.slotIndex;
            const dateDisplay = formatSlotDate(item.slot, dateLocale);

            return (
              <button
                type="button"
                key={item.slotIndex}
                onClick={() => setSelectedSlotIndex(item.slotIndex)}
                className={finalizeSlotItemVariants({ isSelected })}
              >
                {/* Left: Trophy icon on the far left across the row height */}
                {item.isTop && (
                   <div className="shrink-0 self-stretch flex items-center justify-center pr-0.5 text-warning-text">
                    <Trophy className="w-5 h-5 text-warning-text" />
                  </div>
                )}

                {/* Right: Info row + Progress bar */}
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={finalizeCheckRadioVariants({ isSelected })}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <span className="font-semibold text-sm text-foreground truncate">
                        {dateDisplay}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="px-2 py-0.5 rounded-md bg-muted/60 text-xs font-semibold text-foreground flex items-center gap-1">
                        <span className="text-success-text font-bold">✓ {item.tally.yes.length}</span>
                        {item.tally.maybe.length > 0 && (
                          <span className="text-warning-text font-medium">? {item.tally.maybe.length}</span>
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
                      className="h-full bg-success rounded-full transition-all duration-300"
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
