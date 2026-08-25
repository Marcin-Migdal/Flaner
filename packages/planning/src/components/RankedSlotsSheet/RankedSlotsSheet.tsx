import { format, parseISO, Locale } from "date-fns";
import { pl, enUS } from "date-fns/locale";
import { Trophy, Medal, Award, Check, X } from "lucide-react";
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
import {
  rankedSlotCardVariants,
  rankedSlotProgressVariants,
  rankedVoteButtonVariants,
} from "./RankedSlotsSheet.styles";

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

function computeRankedSlots<T extends { score: number; yesVoters: string[]; maybeVoters: string[] }>(
  sortedSlots: T[]
): (T & { rank: number })[] {
  let lastRank = 1;
  const result: (T & { rank: number })[] = [];
  for (let i = 0; i < sortedSlots.length; i++) {
    const item = sortedSlots[i];
    if (i > 0) {
      const prev = sortedSlots[i - 1];
      const isSameScore =
        item.score === prev.score &&
        item.yesVoters.length === prev.yesVoters.length &&
        item.maybeVoters.length === prev.maybeVoters.length;

      if (!isSameScore) {
        lastRank = i + 1;
      }
    }
    result.push({
      ...item,
      rank: lastRank,
    });
  }
  return result;
}

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
    if (b.yesVoters.length !== a.yesVoters.length) return b.yesVoters.length - a.yesVoters.length;
    return a.originalIndex - b.originalIndex;
  });

  // Calculate tie / ex-aequo ranking
  const rankedSlots = computeRankedSlots(sortedSlots);

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
          {rankedSlots.map((item) => {
            const startDate = parseISO(item.slot.start);
            const endDate = parseISO(item.slot.end);
            const isSameDay = item.slot.start === item.slot.end;
            const dateDisplay = formatRankedSlotDate(startDate, endDate, isSameDay, dateLocale);

            const isWinning = event.isFinalized && event.finalizedSlotIndex === item.originalIndex;
            const isRankOne = item.score > 0 && item.rank === 1;

            let rankBadge = null;
            if (isRankOne) {
              rankBadge = (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-500/15 text-yellow-500 border border-yellow-500/30 shrink-0">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>#1</span>
                </div>
              );
            } else if (item.score > 0 && item.rank === 2) {
              rankBadge = (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-slate-400/15 text-slate-400 border border-slate-400/30 shrink-0">
                  <Medal className="w-3.5 h-3.5" />
                  <span>#2</span>
                </div>
              );
            } else if (item.score > 0 && item.rank === 3) {
              rankBadge = (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-700/15 text-amber-600 border border-amber-700/30 shrink-0">
                  <Award className="w-3.5 h-3.5" />
                  <span>#3</span>
                </div>
              );
            } else {
              rankBadge = (
                <div className="px-2 py-0.5 rounded-full text-xs font-semibold text-muted-foreground bg-muted shrink-0">
                  #{item.rank}
                </div>
              );
            }

            const cardStatus = isWinning ? "winning" : isRankOne ? "top" : "normal";

            return (
              <div
                key={item.originalIndex}
                className={rankedSlotCardVariants({ status: cardStatus })}
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
                    className={rankedSlotProgressVariants({ status: isRankOne ? "top" : "normal" })}
                    style={{ width: `${item.matchPercentage}%` }}
                  />
                </div>

                {/* Voters Breakdown */}
                <div className="flex flex-col gap-2 pt-1">
                  {/* YES Voters */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-vote-yes-tint text-vote-yes-text border border-vote-yes-border/30">
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
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-vote-maybe-tint text-vote-maybe-text border border-vote-maybe-border/30">
                        <span className="font-extrabold text-[11px] leading-none select-none">?</span>
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

                  {/* NO Voters */}
                  {item.noVoters.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-vote-no-tint text-vote-no-text border border-vote-no-border/30">
                        <X className="w-3 h-3 stroke-[3]" />
                        <span>{item.noVoters.length}</span>
                      </span>

                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        {item.noVoters.map((uid) => {
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
                      className={rankedVoteButtonVariants({
                        vote: "yes",
                        active: item.currentUserVote === "yes",
                      })}
                      onClick={() =>
                        onVoteSlot(
                           item.originalIndex,
                          item.currentUserVote === "yes" ? null : "yes"
                        )
                      }
                      title={item.currentUserVote === "yes" ? t("voting.unvoted") : t("voting.yes")}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>

                    {/* Button 2: Może (Maybe) */}
                    <button
                      type="button"
                      className={rankedVoteButtonVariants({
                        vote: "maybe",
                        active: item.currentUserVote === "maybe",
                      })}
                      onClick={() =>
                        onVoteSlot(
                          item.originalIndex,
                          item.currentUserVote === "maybe" ? null : "maybe"
                        )
                      }
                      title={item.currentUserVote === "maybe" ? t("voting.unvoted") : t("voting.maybe")}
                    >
                      <span className="font-extrabold text-[13px] leading-none select-none">?</span>
                    </button>

                    {/* Button 3: Nie (No) */}
                    <button
                      type="button"
                      className={rankedVoteButtonVariants({
                        vote: "no",
                        active: item.currentUserVote === "no",
                      })}
                      onClick={() =>
                        onVoteSlot(
                          item.originalIndex,
                          item.currentUserVote === "no" ? null : "no"
                        )
                      }
                      title={item.currentUserVote === "no" ? t("voting.unvoted") : t("voting.no")}
                    >
                      <X className="w-4 h-4 stroke-[3]" />
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

