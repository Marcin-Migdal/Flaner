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
import { formatSlotDate } from "../../utils/formatSlotDate";
import { rankSlots } from "../../utils/slotRanking";

export type RankedSlotsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: SchedulerEvent;
  participantsProfiles?: ParticipantResult[];
  currentUserId?: string;
  onVoteSlot?: (slotIndex: number, newVote: VoteType | null) => Promise<void>;
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

  const { ranked: rankedSlots } = rankSlots(event);

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
          <div className="flex items-center gap-2 text-warning-text font-semibold text-xs tracking-wider uppercase">
            <Trophy className="w-4 h-4 text-warning-text" />
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
            const dateDisplay = formatSlotDate(item.slot, dateLocale);

            const isWinning = event.isFinalized && event.finalizedSlotIndex === item.slotIndex;
            const isRankOne = item.isTop;
            const currentUserVote = currentUserId ? item.slot.votes?.[currentUserId] : undefined;

            let rankBadge = null;
            if (isRankOne) {
              rankBadge = (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-medal-gold/15 text-medal-gold border border-medal-gold/30 shrink-0">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>#1</span>
                </div>
              );
            } else if (item.score > 0 && item.rank === 2) {
              rankBadge = (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-medal-silver/15 text-medal-silver border border-medal-silver/30 shrink-0">
                  <Medal className="w-3.5 h-3.5" />
                  <span>#2</span>
                </div>
              );
            } else if (item.score > 0 && item.rank === 3) {
              rankBadge = (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-medal-bronze/15 text-medal-bronze border border-medal-bronze/30 shrink-0">
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
                key={item.slotIndex}
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
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-bold bg-vote-yes-subtle text-vote-yes-text border border-vote-yes-border/30">
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>{item.tally.yes.length}</span>
                    </span>

                    <div className="flex items-center -space-x-1.5 overflow-hidden">
                      {item.tally.yes.map((uid) => {
                        const profile = getProfile(uid);
                        return (
                          <Avatar
                            key={uid}
                            className="w-5 h-5 ring-2 ring-card border-0"
                            tooltip={profile?.name}
                          >
                            <AvatarImage src={profile?.avatarUrl} />
                            <AvatarFallback className="text-4xs">
                              {profile?.name?.[0]?.toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                        );
                      })}
                    </div>
                  </div>

                  {/* MAYBE Voters */}
                  {item.tally.maybe.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-bold bg-vote-maybe-subtle text-vote-maybe-text border border-vote-maybe-border/30">
                        <span className="font-extrabold text-2xs leading-none select-none">?</span>
                        <span>{item.tally.maybe.length}</span>
                      </span>

                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        {item.tally.maybe.map((uid) => {
                          const profile = getProfile(uid);
                          return (
                            <Avatar
                              key={uid}
                              className="w-5 h-5 ring-2 ring-card border-0"
                              tooltip={profile?.name}
                            >
                              <AvatarImage src={profile?.avatarUrl} />
                              <AvatarFallback className="text-4xs">
                                {profile?.name?.[0]?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* NO Voters */}
                  {item.tally.no.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-bold bg-vote-no-subtle text-vote-no-text border border-vote-no-border/30">
                        <X className="w-3 h-3 stroke-[3]" />
                        <span>{item.tally.no.length}</span>
                      </span>

                      <div className="flex items-center -space-x-1.5 overflow-hidden">
                        {item.tally.no.map((uid) => {
                          const profile = getProfile(uid);
                          return (
                            <Avatar
                              key={uid}
                              className="w-5 h-5 ring-2 ring-card border-0"
                              tooltip={profile?.name}
                            >
                              <AvatarImage src={profile?.avatarUrl} />
                              <AvatarFallback className="text-4xs">
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
                    <span className="text-2xs text-muted-foreground mr-auto">
                      {t("voting.yourVote")}:
                    </span>

                    {/* Button 1: Tak (Yes) */}
                    <button
                      type="button"
                      className={rankedVoteButtonVariants({
                        vote: "yes",
                        active: currentUserVote === "yes",
                      })}
                      onClick={() =>
                        onVoteSlot(
                           item.slotIndex,
                          currentUserVote === "yes" ? null : "yes"
                        )
                      }
                      title={currentUserVote === "yes" ? t("voting.unvoted") : t("voting.yes")}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>

                    {/* Button 2: Może (Maybe) */}
                    <button
                      type="button"
                      className={rankedVoteButtonVariants({
                        vote: "maybe",
                        active: currentUserVote === "maybe",
                      })}
                      onClick={() =>
                        onVoteSlot(
                          item.slotIndex,
                          currentUserVote === "maybe" ? null : "maybe"
                        )
                      }
                      title={currentUserVote === "maybe" ? t("voting.unvoted") : t("voting.maybe")}
                    >
                      <span className="font-extrabold text-sm leading-none select-none">?</span>
                    </button>

                    {/* Button 3: Nie (No) */}
                    <button
                      type="button"
                      className={rankedVoteButtonVariants({
                        vote: "no",
                        active: currentUserVote === "no",
                      })}
                      onClick={() =>
                        onVoteSlot(
                          item.slotIndex,
                          currentUserVote === "no" ? null : "no"
                        )
                      }
                      title={currentUserVote === "no" ? t("voting.unvoted") : t("voting.no")}
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

