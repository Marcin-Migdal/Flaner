import type { SchedulerEvent } from "../../../../api/events/types";
import type { ParticipantResult } from "../../../../api/participants";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";

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
    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col">
      <h3 className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-4 px-1">
        {t("hub.participants")}
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
                className={`group flex items-center gap-4 p-3 rounded-2xl border transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 cursor-default ${
                  isUnvoted
                    ? "bg-rose-500/5 border-rose-500/25 hover:border-rose-500/40 hover:bg-rose-500/10"
                    : "bg-background/50 hover:bg-white/[0.08] border-white/5 hover:border-white/10"
                }`}
              >
                <div className="relative shrink-0">
                  <div
                    className={`w-11 h-11 rounded-full bg-muted overflow-hidden ring-2 transition-all duration-300 ring-offset-2 ring-offset-background ${
                      isUnvoted
                        ? "ring-rose-500/70 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                        : "ring-transparent group-hover:ring-brand/40"
                    }`}
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
