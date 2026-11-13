import { Check, X } from "lucide-react";
import type { ParticipantResult } from "../../api/participants";
import type { VoteType } from "../../api/events/types";
import type { CalendarEventComponentProps } from "@flaner/ui-components";
import { cn } from "@flaner/shared/utils";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { getSlotScore, tallyVotes } from "../../utils/slotRanking";
import {
  slotSegmentRootVariants,
  slotQuickVoteToolbarStyles,
  slotVoteBadgeContainerVariants,
  slotQuickVoteButtonVariants,
  slotActiveVoteBadgeVariants,
  slotStyles,
  type SlotPosition,
  type SlotHighlight,
} from "./SlotEventComponent.styles";

export type SlotMetaData = {
  slotIndex: number;
  votes: Record<string, VoteType>;
  totalParticipantsCount: number;
  participantsProfiles?: ParticipantResult[];
  currentUserId?: string;
  isTopVoted?: boolean;
  isFinalized?: boolean;
  isWinningSlot?: boolean;
  onQuickVote?: (newVote: VoteType | null) => void;
};

export function SlotEventComponent(props: CalendarEventComponentProps<SlotMetaData>) {
  const {
    event,
    onClick,
    onMouseEnter,
    onMouseLeave,
    className,
    isHovered,
    isFirstSegment,
    isFirstInRow = props.isFirstSegment,
    isLastInRow = props.isLastSegment,
    continuesNextInRow = !props.isLastSegment,
  } = props;
  const meta = event.metaData;
  const { t } = usePlanningTranslations();

  const position: SlotPosition =
    isFirstInRow && isLastInRow
      ? "single"
      : isFirstInRow
        ? "start"
        : isLastInRow
          ? "end"
          : "middle";

  if (!meta) {
    return (
      <div
        className={cn(
          slotStyles.emptySlot,
          slotSegmentRootVariants({ position, continuesNextInRow }),
          className,
        )}
        style={{
          backgroundColor: isHovered
            ? `color-mix(in srgb, ${event.color || "var(--primary)"} 85%, var(--foreground))`
            : event.color || "var(--primary)",
          color: "var(--foreground)",
        }}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.(e);
          }
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <span className="truncate">{event.title}</span>
      </div>
    );
  }

  const {
    votes = {},
    totalParticipantsCount,
    currentUserId,
    isTopVoted,
    isFinalized,
    isWinningSlot,
  } = meta;

  const tally = tallyVotes(votes);
  const yesVotes = tally.yes.length;
  const maybeVotes = tally.maybe.length;
  const noVotes = tally.no.length;
  const totalVotesCast = yesVotes + maybeVotes + noVotes;

  const score = getSlotScore(tally);
  const ratio = score / Math.max(1, totalParticipantsCount);

  // Fill strength encodes the score; 25% is the floor for slots without votes or with only "no"
  const basePercentage = totalVotesCast === 0 || ratio === 0 ? 25 : Math.round(Math.min(100, 25 + ratio * 75));

  const opacityPercentage = isHovered ? Math.min(100, basePercentage + 25) : basePercentage;
  const baseColor = event.color || "var(--primary)";
  const backgroundColor = `color-mix(in srgb, ${baseColor} ${opacityPercentage}%, ${isHovered ? "var(--accent)" : "var(--card)"})`;

  const currentUserVote = currentUserId ? votes[currentUserId] : undefined;

  const highlight: SlotHighlight = isWinningSlot
    ? "winning"
    : isTopVoted
      ? "top"
      : "none";

  return (
    <div
      className={cn(
        slotSegmentRootVariants({
          position,
          continuesNextInRow,
          highlight,
          isHovered,
        }),
        className,
      )}
      style={{
        backgroundColor,
        color: "var(--foreground)",
      }}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(e);
        }
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Floating 3-Button Quick-Vote Toolbar on Hover (visible on every segment below slot) */}
      {!isFinalized && meta.onQuickVote && (
        <div className={slotQuickVoteToolbarStyles.container}>
          <div className={slotQuickVoteToolbarStyles.card}>
            {/* Tak / Yes Button */}
            <button
              type="button"
              className={slotQuickVoteButtonVariants({
                vote: "yes",
                active: currentUserVote === "yes",
              })}
              title={currentUserVote === "yes" ? t("voting.retractVote") : t("voting.voteYes")}
              onClick={(e) => {
                e.stopPropagation();
                meta.onQuickVote?.(currentUserVote === "yes" ? null : "yes");
              }}
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </button>

            {/* Może / Maybe Button */}
            <button
              type="button"
              className={slotQuickVoteButtonVariants({
                vote: "maybe",
                active: currentUserVote === "maybe",
              })}
              title={currentUserVote === "maybe" ? t("voting.retractVote") : t("voting.voteMaybe")}
              onClick={(e) => {
                e.stopPropagation();
                meta.onQuickVote?.(currentUserVote === "maybe" ? null : "maybe");
              }}
            >
              <span className="font-extrabold text-xs leading-none select-none">?</span>
            </button>

            {/* Nie / No Button */}
            <button
              type="button"
              className={slotQuickVoteButtonVariants({
                vote: "no",
                active: currentUserVote === "no",
              })}
              title={currentUserVote === "no" ? t("voting.retractVote") : t("voting.voteNo")}
              onClick={(e) => {
                e.stopPropagation();
                meta.onQuickVote?.(currentUserVote === "no" ? null : "no");
              }}
            >
              <X className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          </div>
        </div>
      )}

      <div className={slotStyles.contentRow}>
        {/* Active Vote Badge in Slot: Shown on first slot or first in row if user has voted */}
        {(isFirstSegment || isFirstInRow) && !isFinalized && currentUserVote && (
          <div
            className={slotActiveVoteBadgeVariants({
              vote: currentUserVote,
            })}
            title={t(`voting.${currentUserVote}`)}
          >
            {currentUserVote === "yes" && <Check className="w-2.5 h-2.5 md:w-3 md:h-3 stroke-[3]" />}
            {currentUserVote === "maybe" && (
              <span className="font-extrabold text-5xs md:text-2xs leading-none select-none">?</span>
            )}
            {currentUserVote === "no" && <X className="w-2.5 h-2.5 md:w-3 md:h-3 stroke-[3]" />}
          </div>
        )}

        {/* Vote Counts Summary Badge */}
        {isFirstSegment && (
          <>
            {/* Below 1284px: Simple badge (Only "Tak" votes count) */}
            <div className={slotVoteBadgeContainerVariants({ breakpoint: "mobile", continuesNextInRow })}>
              {yesVotes > 0 ? (
                <div className={slotStyles.simpleBadgeMobile}>
                  <span className="text-5xs md:text-3xs">✓</span>
                  <span>{yesVotes}</span>
                </div>
              ) : null}
            </div>

            {/* From 1284px upwards: Compact vs Full via pure CSS Container Queries */}
            <div className={slotVoteBadgeContainerVariants({ breakpoint: "desktop", continuesNextInRow })}>
              <div className={slotStyles.desktopBadgeCard}>
                {/* Compact badge (active when slot width < 120px) */}
                <div className={slotStyles.desktopCompact}>
                  {yesVotes > 0 ? (
                    <span className="text-success-text inline-flex items-center gap-0.5">
                      <span className="text-3xs">✓</span>
                      <span>{yesVotes}/{totalParticipantsCount}</span>
                    </span>
                  ) : maybeVotes > 0 ? (
                    <span className="text-warning-text inline-flex items-center gap-0.5">
                      <span className="text-3xs">?</span>
                      <span>{maybeVotes}/{totalParticipantsCount}</span>
                    </span>
                  ) : noVotes > 0 ? (
                    <span className="text-danger-text inline-flex items-center gap-0.5">
                      <span className="text-3xs">✕</span>
                      <span>{noVotes}/{totalParticipantsCount}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">0/{totalParticipantsCount}</span>
                  )}
                </div>

                {/* Full badge (active when slot width >= 120px) */}
                <div className={slotStyles.desktopFull}>
                  {yesVotes > 0 && (
                    <span className="text-success-text inline-flex items-center gap-0.5">
                      <span className="text-3xs">✓</span>
                      <span>{yesVotes}</span>
                    </span>
                  )}
                  {maybeVotes > 0 && (
                    <span className="text-warning-text inline-flex items-center gap-0.5">
                      <span className="text-3xs">?</span>
                      <span>{maybeVotes}</span>
                    </span>
                  )}
                  {noVotes > 0 && (
                    <span className="text-danger-text inline-flex items-center gap-0.5">
                      <span className="text-3xs">✕</span>
                      <span>{noVotes}</span>
                    </span>
                  )}
                  {totalVotesCast === 0 && <span className="text-muted-foreground">0/{totalParticipantsCount}</span>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

