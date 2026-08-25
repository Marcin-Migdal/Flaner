import { Avatar, AvatarFallback, AvatarImage } from "@flaner/ui-components";
import { Check, Minus, X } from "lucide-react";
import type { ProposedDateSlot, VoteType } from "../../../api/events/types";
import type { ParticipantResult } from "../../../api/participants";
import { usePlanningTranslations } from "../../../hooks/usePlanningTranslations";
import {
  gridParticipantRowVariants,
  gridParticipantAvatarVariants,
  gridStaticVoteBadgeVariants,
  gridVoteButtonVariants,
} from "./AvailabilityGridParticipant.styles";

export type AvailabilityGridParticipantProps = {
  uid: string;
  profile?: ParticipantResult;
  isCurrentUser: boolean;
  isCreator: boolean;
  proposedDates: ProposedDateSlot[];
  isFinalized?: boolean;
  gridTemplateColumns: string;
  onVoteClick: (slotIndex: number, clickedVote: VoteType, currentVote?: VoteType) => void;
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
      className={gridParticipantRowVariants({ isCurrentUser })}
      style={{ gridTemplateColumns }}
    >
      {/* Participant Info Cell */}
      <div className="p-2 sm:p-2.5 flex items-center gap-2 border-r border-border/50 overflow-hidden">
        <div className="relative shrink-0">
          <Avatar className={gridParticipantAvatarVariants({ hasNoVotes })}>
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
                  className={gridVoteButtonVariants({
                    vote: "yes",
                    active: vote === "yes",
                  })}
                  onClick={() => onVoteClick(slotIdx, "yes", vote)}
                  title={vote === "yes" ? t("voting.unvoted") : t("voting.yes")}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>

                {/* Button 2: Może (Maybe) toggle */}
                <button
                  type="button"
                  className={gridVoteButtonVariants({
                    vote: "maybe",
                    active: vote === "maybe",
                  })}
                  onClick={() => onVoteClick(slotIdx, "maybe", vote)}
                  title={vote === "maybe" ? t("voting.unvoted") : t("voting.maybe")}
                >
                  <span className="font-extrabold text-[12px] leading-none select-none">?</span>
                </button>

                {/* Button 3: Nie (No) toggle */}
                <button
                  type="button"
                  className={gridVoteButtonVariants({
                    vote: "no",
                    active: vote === "no",
                  })}
                  onClick={() => onVoteClick(slotIdx, "no", vote)}
                  title={vote === "no" ? t("voting.unvoted") : t("voting.no")}
                >
                  <X className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                {vote === "yes" && (
                  <div
                    className={gridStaticVoteBadgeVariants({ vote: "yes" })}
                    title={t("voting.yes")}
                  >
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                  </div>
                )}

                {vote === "maybe" && (
                  <div
                    className={gridStaticVoteBadgeVariants({ vote: "maybe" })}
                    title={t("voting.maybe")}
                  >
                    <span className="font-extrabold text-[12px] leading-none select-none">?</span>
                  </div>
                )}

                {vote === "no" && (
                  <div
                    className={gridStaticVoteBadgeVariants({ vote: "no" })}
                    title={t("voting.no")}
                  >
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                {!vote && (
                  <div
                    className={gridStaticVoteBadgeVariants({ vote: "unvoted" })}
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

