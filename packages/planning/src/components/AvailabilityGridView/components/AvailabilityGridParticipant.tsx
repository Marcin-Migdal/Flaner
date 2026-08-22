import { Avatar, AvatarFallback, AvatarImage } from "@flaner/ui-components";
import { Check, HelpCircle, Minus, Plus, X } from "lucide-react";
import type { ProposedDateSlot, VoteType } from "../../../api/events/types";
import type { ParticipantResult } from "../../../api/participants";
import { usePlanningTranslations } from "../../../hooks/usePlanningTranslations";

export type AvailabilityGridParticipantProps = {
  uid: string;
  profile?: ParticipantResult;
  isCurrentUser: boolean;
  isCreator: boolean;
  proposedDates: ProposedDateSlot[];
  isFinalized?: boolean;
  gridTemplateColumns: string;
  onVoteClick: (slotIndex: number, clickedVote: "yes" | "maybe", currentVote?: VoteType) => void;
};

export const AvailabilityGridParticipant = ({
  uid,
  profile,
  isCurrentUser,
  isCreator,
  proposedDates,
  isFinalized,
  gridTemplateColumns,
  onVoteClick,
}: AvailabilityGridParticipantProps) => {
  const { t } = usePlanningTranslations();

  // Check if user has voted on any slot
  const userVotesCount = proposedDates.filter((slot) => slot.votes && slot.votes[uid]).length;
  const hasNoVotes = userVotesCount === 0;

  return (
    <div
      className={`grid items-center transition-colors hover:bg-muted/30 ${
        isCurrentUser ? "bg-primary/5" : ""
      }`}
      style={{ gridTemplateColumns }}
    >
      {/* Participant Info Cell */}
      <div className="p-2 sm:p-2.5 flex items-center gap-2 border-r border-border/50 overflow-hidden">
        <div className="relative shrink-0">
          <Avatar className={`w-7 h-7 sm:w-8 sm:h-8 ${hasNoVotes ? "ring-2 ring-rose-500/60" : ""}`}>
            <AvatarImage src={profile?.avatarUrl} />
            <AvatarFallback className="text-xs font-bold">
              {profile?.name?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          {hasNoVotes && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-card"
              title={t("voting.unvoted")}
            />
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
              {profile?.name || uid}
            </span>
            {isCurrentUser && (
              <span className="text-[9px] font-bold text-primary px-1 py-0.2 rounded bg-primary/10">
                {t("grid.you")}
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground truncate">
            {isCreator ? t("hub.status.creator") : t("hub.status.invited")}
          </span>
        </div>
      </div>

      {/* Vote Cells for each slot */}
      {proposedDates.map((slot, slotIdx) => {
        const vote = slot.votes ? slot.votes[uid] : undefined;
        const isInteractive = isCurrentUser && !isFinalized;

        return (
          <div
            key={slotIdx}
            className="p-1.5 sm:p-2 flex items-center justify-center border-r border-border/50 last:border-r-0"
          >
            {isInteractive ? (
              <div className="flex items-center justify-center gap-1">
                {/* Button 1: Tak (Yes) toggle */}
                <button
                  type="button"
                  className={`shrink-0 p-0 border flex items-center justify-center w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-xl cursor-pointer transition-all duration-200 ease-in-out group/voteYes ${
                    vote === "yes"
                      ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/40 hover:bg-rose-500/20 hover:text-rose-500 hover:border-rose-500/40"
                      : "bg-muted/30 text-muted-foreground/50 border-border/40 hover:bg-emerald-500/15 hover:text-emerald-500 hover:border-emerald-500/30"
                  }`}
                  onClick={() => onVoteClick(slotIdx, "yes", vote)}
                  title={vote === "yes" ? t("voting.unvoted") : t("voting.yes")}
                >
                  {vote === "yes" ? (
                    <>
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3] group-hover/voteYes:hidden" />
                      <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3] hidden group-hover/voteYes:block" />
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2] group-hover/voteYes:hidden" />
                      <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3] hidden group-hover/voteYes:block" />
                    </>
                  )}
                </button>

                {/* Button 2: Może (Maybe) toggle */}
                <button
                  type="button"
                  className={`shrink-0 p-0 border flex items-center justify-center w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-xl cursor-pointer transition-all duration-200 ease-in-out group/voteMaybe ${
                    vote === "maybe"
                      ? "bg-amber-500/20 text-amber-500 border-amber-500/40 hover:bg-rose-500/20 hover:text-rose-500 hover:border-rose-500/40"
                      : "bg-muted/30 text-muted-foreground/50 border-border/40 hover:bg-amber-500/15 hover:text-amber-500 hover:border-amber-500/30"
                  }`}
                  onClick={() => onVoteClick(slotIdx, "maybe", vote)}
                  title={vote === "maybe" ? t("voting.unvoted") : t("voting.maybe")}
                >
                  {vote === "maybe" ? (
                    <>
                      <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5] group-hover/voteMaybe:hidden" />
                      <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3] hidden group-hover/voteMaybe:block" />
                    </>
                  ) : (
                    <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2]" />
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                {vote === "yes" && (
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/20 text-emerald-500 border border-emerald-500/40 flex items-center justify-center transition-all duration-300 ease-in-out"
                    title={t("voting.yes")}
                  >
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                  </div>
                )}

                {vote === "maybe" && (
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/40 flex items-center justify-center transition-all duration-300 ease-in-out"
                    title={t("voting.maybe")}
                  >
                    <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                  </div>
                )}

                {vote === "no" && (
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-rose-500/20 text-rose-500 border border-rose-500/40 flex items-center justify-center transition-all duration-300 ease-in-out"
                    title={t("voting.no")}
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                  </div>
                )}

                {!vote && (
                  <div
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-muted/30 text-muted-foreground/40 border border-border/30 flex items-center justify-center transition-all duration-300 ease-in-out"
                    title={t("voting.unvoted")}
                  >
                    <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2]" />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
