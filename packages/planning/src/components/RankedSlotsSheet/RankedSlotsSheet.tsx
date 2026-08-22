import { format, parseISO, Locale } from "date-fns";
import { pl, enUS } from "date-fns/locale";
import { Trophy, Medal, Award, Check, HelpCircle, Minus, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@flaner/ui-components";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import type { SchedulerEvent, VoteType } from "../../api/events/types";
import type { ParticipantResult } from "../../api/participants";

export type RankedSlotsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: SchedulerEvent;
  participantsProfiles?: ParticipantResult[];
  currentUserId?: string;
  onVoteSlot?: (slotIndex: number, newVote: VoteType | null) => Promise<void>;
};

const formatRankedSlotDate = (
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

export const RankedSlotsSheet = ({
  open,
  onOpenChange,
  event,
  participantsProfiles = [],
  currentUserId,
  onVoteSlot,
}: RankedSlotsSheetProps) => {
  const { t, i18n } = usePlanningTranslations();
  const dateLocale = i18n.language === "pl" ? pl : enUS;

  const totalParticipants = Math.max(1, event.participants.length);

  const slotsWithScores = event.proposedDates.map((slot, originalIndex) => {
    const votes = slot.votes || {};
    const yesVoters = Object.entries(votes)
      .filter(([_, v]) => v === "yes")
      .map(([uid]) => uid);
    const maybeVoters = Object.entries(votes)
      .filter(([_, v]) => v === "maybe")
      .map(([uid]) => uid);
    const noVoters = Object.entries(votes)
      .filter(([_, v]) => v === "no")
      .map(([uid]) => uid);

    const score = yesVoters.length * 1.0 + maybeVoters.length * 0.5;
    const matchPercentage = Math.round((yesVoters.length / totalParticipants) * 100);

    return {
      slot,
      originalIndex,
      yesVoters,
      maybeVoters,
      noVoters,
      score,
      matchPercentage,
      currentUserVote: currentUserId ? votes[currentUserId] : undefined,
    };
  });

  const sortedSlots = [...slotsWithScores].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.yesVoters.length - a.yesVoters.length;
  });

  const getProfile = (uid: string) => {
    return participantsProfiles.find((p) => p.id === uid);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[90vw] max-w-[90vw] data-[side=right]:w-[90vw] sm:data-[side=right]:w-full sm:max-w-[498px] 2xl:max-w-[600px] p-0 flex flex-col bg-card/95 backdrop-blur-xl border-l border-border shadow-2xl"
      >
        <SheetHeader className="p-5 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs tracking-wider uppercase">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>{t("rankedSheet.eyebrow")}</span>
          </div>
          <SheetTitle className="text-xl font-bold tracking-tight text-foreground mt-2">
            {event.name}
          </SheetTitle>
          <SheetDescription className="text-sm text-muted-foreground">
            {t("rankedSheet.description")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-4">
          {sortedSlots.map((item, rankIndex) => {
            const rank = rankIndex + 1;
            const startDate = parseISO(item.slot.start);
            const endDate = parseISO(item.slot.end);
            const isSameDay = item.slot.start === item.slot.end;
            const dateDisplay = formatRankedSlotDate(startDate, endDate, isSameDay, dateLocale);

            const isWinning = event.isFinalized && event.finalizedSlotIndex === item.originalIndex;

            let rankBadge = null;
            if (rank === 1) {
              rankBadge = (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500/15 text-yellow-500 border border-yellow-500/30 shrink-0">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>#1</span>
                </div>
              );
            } else if (rank === 2) {
              rankBadge = (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-400/15 text-slate-400 border border-slate-400/30 shrink-0">
                  <Medal className="w-3.5 h-3.5" />
                  <span>#2</span>
                </div>
              );
            } else if (rank === 3) {
              rankBadge = (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-700/15 text-amber-600 border border-amber-700/30 shrink-0">
                  <Award className="w-3.5 h-3.5" />
                  <span>#3</span>
                </div>
              );
            } else {
              rankBadge = (
                <div className="px-2 py-0.5 rounded-full text-xs font-semibold text-muted-foreground bg-muted shrink-0">
                  #{rank}
                </div>
              );
            }

            return (
              <div
                key={item.originalIndex}
                className={`relative flex flex-col gap-3 p-3.5 sm:p-4 rounded-xl border transition-all ${
                  isWinning
                    ? "bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30"
                    : rank === 1
                    ? "bg-card border-yellow-500/40 shadow-sm"
                    : "bg-card/70 border-border/60"
                }`}
              >
                {/* Header: Rank + Date + Score */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {rankBadge}
                    <span className="font-bold text-xs sm:text-sm text-foreground leading-tight">{dateDisplay}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs sm:text-sm font-bold text-primary">{item.matchPercentage}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-muted/40 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      rank === 1 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${item.matchPercentage}%` }}
                  />
                </div>

                {/* Voters Breakdown */}
                <div className="flex flex-col gap-2 pt-1">
                  {/* YES Voters */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>{item.yesVoters.length}</span>
                    </span>

                    <div className="flex items-center -space-x-1.5 overflow-hidden">
                      {item.yesVoters.map((uid) => {
                        const profile = getProfile(uid);
                        return (
                          <Avatar
                            key={uid}
                            className="w-5 h-5 ring-2 ring-card border-0"
                            title={profile?.name || uid}
                          >
                            <AvatarImage src={profile?.avatarUrl} />
                            <AvatarFallback className="text-[9px]">
                              {profile?.name?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                        );
                      })}
                    </div>
                  </div>

                  {/* MAYBE Voters */}
                  {item.maybeVoters.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        <HelpCircle className="w-3 h-3 stroke-[3]" />
                        <span>{item.maybeVoters.length}</span>
                      </span>

                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        {item.maybeVoters.map((uid) => {
                          const profile = getProfile(uid);
                          return (
                            <Avatar
                              key={uid}
                              className="w-5 h-5 ring-2 ring-card border-0"
                              title={profile?.name || uid}
                            >
                              <AvatarImage src={profile?.avatarUrl} />
                              <AvatarFallback className="text-[9px]">
                                {profile?.name?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick vote actions inside sheet */}
                {!event.isFinalized && onVoteSlot && currentUserId && (
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">
                    <span className="text-[11px] text-muted-foreground mr-auto">
                      {t("voting.yourVote")}:
                    </span>

                    {/* Button 1: Tak (Yes) */}
                    <button
                      type="button"
                      className={`shrink-0 p-0 border flex items-center justify-center w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl cursor-pointer transition-all duration-200 ease-in-out group/voteYes ${
                        item.currentUserVote === "yes"
                          ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-500 hover:border-rose-500/40"
                          : "bg-muted/40 text-muted-foreground/60 border-border/40 hover:bg-emerald-500/15 hover:text-emerald-500 hover:border-emerald-500/30"
                      }`}
                      onClick={() =>
                        onVoteSlot(
                          item.originalIndex,
                          item.currentUserVote === "yes" ? null : "yes"
                        )
                      }
                      title={item.currentUserVote === "yes" ? t("voting.unvoted") : t("voting.yes")}
                    >
                      {item.currentUserVote === "yes" ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3] group-hover/voteYes:hidden" />
                          <Minus className="w-4 h-4 stroke-[3] hidden group-hover/voteYes:block" />
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 stroke-[2] group-hover/voteYes:hidden" />
                          <Check className="w-4 h-4 stroke-[3] hidden group-hover/voteYes:block" />
                        </>
                      )}
                    </button>

                    {/* Button 2: Może (Maybe) */}
                    <button
                      type="button"
                      className={`shrink-0 p-0 border flex items-center justify-center w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl cursor-pointer transition-all duration-200 ease-in-out group/voteMaybe ${
                        item.currentUserVote === "maybe"
                          ? "bg-amber-500/20 text-amber-500 border-amber-500/40 hover:bg-rose-500/20 hover:text-rose-500 hover:border-rose-500/40"
                          : "bg-muted/40 text-muted-foreground/60 border-border/40 hover:bg-amber-500/15 hover:text-amber-500 hover:border-amber-500/30"
                      }`}
                      onClick={() =>
                        onVoteSlot(
                          item.originalIndex,
                          item.currentUserVote === "maybe" ? null : "maybe"
                        )
                      }
                      title={item.currentUserVote === "maybe" ? t("voting.unvoted") : t("voting.maybe")}
                    >
                      {item.currentUserVote === "maybe" ? (
                        <>
                          <HelpCircle className="w-4 h-4 stroke-[2.5] group-hover/voteMaybe:hidden" />
                          <Minus className="w-4 h-4 stroke-[3] hidden group-hover/voteMaybe:block" />
                        </>
                      ) : (
                        <HelpCircle className="w-4 h-4 stroke-[2]" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
