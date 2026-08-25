import type { SchedulerEvent } from "../../../../api/events/types";
import type { ParticipantResult } from "../../../../api/participants";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import {
  schedulerParticipantCardVariants,
  schedulerParticipantAvatarRingVariants,
} from "./SchedulerParticipantsList.styles";

export type SchedulerParticipantsListProps = {
  participants?: ParticipantResult[];
  isParticipantsLoading: boolean;
  activeEvent: SchedulerEvent | null;
};

export const SchedulerParticipantsList = ({
  participants,
  isParticipantsLoading,
  activeEvent,
}: SchedulerParticipantsListProps) => {
  const { t } = usePlanningTranslations();

  return (
    <div className="flex-1 max-h-[210px] sm:max-h-[250px] min-[1200px]:max-h-none overflow-y-auto px-4 py-3 flex flex-col">
      <h3 className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-4 px-1 flex items-center gap-1.5">
        <span>{t("hub.participants")}</span>
        <span className="text-[10px] font-semibold text-muted-foreground/70 px-1.5 py-0.5 rounded-full bg-white/5 border border-white/5 tracking-normal tabular-nums leading-none">
          {participants?.length ?? 0}
        </span>
      </h3>

      <div className="flex flex-col gap-3">
        {isParticipantsLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-3 bg-white/5 rounded-2xl border border-transparent animate-pulse"
            >
              <div className="w-11 h-11 rounded-full bg-white/10" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-3 w-24 bg-white/10 rounded-full" />
                <div className="h-2 w-16 bg-white/10 rounded-full" />
              </div>
            </div>
          ))
        ) : participants?.length ? (
          participants.map((p) => {
            // Check if participant has cast any vote in this event
            const hasAnyVote = activeEvent?.proposedDates.some((slot) => slot.votes && slot.votes[p.id]) || false;
            const isUnvoted = !hasAnyVote && !activeEvent?.isFinalized;

            return (
              <div
                key={p.id}
                className={schedulerParticipantCardVariants({ isUnvoted })}
              >
                <div className="relative shrink-0">
                  <div
                    className={schedulerParticipantAvatarRingVariants({ isUnvoted })}
                  >
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-brand/10 text-brand font-bold text-sm">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  {isUnvoted && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-background animate-pulse"
                      title={t("hub.status.unvoted")}
                    />
                  )}
                </div>

                <div className="flex-1 flex flex-col min-w-0">
                  <span className="text-sm font-semibold truncate group-hover:text-brand transition-colors">
                    {p.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground/70 truncate font-medium">
                      {p.id === activeEvent?.creatorId ? t("hub.status.creator") : t("hub.status.going")}
                    </span>
                    {isUnvoted && (
                      <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400">
                        • {t("hub.status.unvoted")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center p-6 text-sm text-muted-foreground/70 bg-white/5 rounded-2xl border border-white/5">
            {t("hub.noParticipants")}
          </div>
        )}
      </div>
    </div>
  );
};
