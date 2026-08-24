import { Check, X } from "lucide-react";
import type { ParticipantResult } from "../../api/participants";
import type { VoteType } from "../../api/events/types";
import type { CalendarEventComponentProps } from "@flaner/ui-components";

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
    isLastSegment: _isLastSegment,
    isFirstInRow = props.isFirstSegment,
    isLastInRow = props.isLastSegment,
    continuesNextInRow = !props.isLastSegment,
  } = props;
  const meta = event.metaData;

  const roundedClasses =
    isFirstInRow && isLastInRow
      ? "rounded-[3px] md:rounded-md"
      : isFirstInRow
        ? "rounded-l-[3px] md:rounded-l-md rounded-r-none"
        : isLastInRow
          ? "rounded-r-[3px] md:rounded-r-md rounded-l-none"
          : "rounded-none";

  const marginClasses = continuesNextInRow
    ? "w-[calc(100%+1px)] -mr-[1px] relative z-[1]"
    : "w-full";

  const paddingClasses = `${
    isFirstInRow && isLastInRow
      ? "px-0.5 md:px-1.5"
      : isFirstInRow
        ? "pl-0.5 pr-1 md:pl-1.5 md:pr-[9px]"
        : isLastInRow
          ? "pl-0 pr-0.5 md:pl-0.5 md:pr-1.5"
          : "px-0"
  }`;

  if (!meta) {
    return (
      <div
        className={`@container box-border ${className} ${roundedClasses} ${marginClasses} ${paddingClasses} flex items-center select-none truncate cursor-pointer overflow-hidden transition-all duration-150`}
        style={{
          backgroundColor: isHovered
            ? `color-mix(in srgb, ${event.color || "var(--primary)"} 85%, #fff)`
            : event.color || "var(--primary)",
          color: "#fff",
        }}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClick?.(e as unknown as React.MouseEvent);
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

  const yesVotes = Object.values(votes).filter((v) => v === "yes").length;
  const maybeVotes = Object.values(votes).filter((v) => v === "maybe").length;
  const noVotes = Object.values(votes).filter((v) => v === "no").length;
  const totalVotesCast = yesVotes + maybeVotes + noVotes;

  const score = yesVotes + maybeVotes * 0.5;
  const ratio = score / Math.max(1, totalParticipantsCount);
  const basePercentage = Math.round(Math.max(0.45, Math.min(1, 0.45 + ratio * 0.55)) * 100);
  const opacityPercentage = isHovered ? Math.min(100, basePercentage + 20) : basePercentage;
  const baseColor = event.color || "var(--primary)";
  const backgroundColor = `color-mix(in srgb, ${baseColor} ${opacityPercentage}%, ${isHovered ? "#2b2b2b" : "#141414"})`;

  const currentUserVote = currentUserId ? votes[currentUserId] : undefined;

  let glowClasses = "";
  const isHighlighted = isWinningSlot || isTopVoted;
  const borderColor = isWinningSlot
    ? "border-emerald-400"
    : "border-amber-400 dark:border-amber-300";

  const zIndex = isHovered ? "z-40" : isWinningSlot ? "z-20" : isTopVoted ? "z-10" : "z-0";

  if (isFirstInRow && isLastInRow) {
    const border = isHighlighted ? `border md:border-2 ${borderColor}` : "border md:border-2 border-transparent";
    glowClasses = `${border} ${zIndex}`;
  } else if (isFirstInRow) {
    const border = isHighlighted
      ? `border-y border-l border-r-0 md:border-y-2 md:border-l-2 md:border-r-0 ${borderColor}`
      : "border-y border-l border-r-0 md:border-y-2 md:border-l-2 md:border-r-0 border-transparent";
    glowClasses = `${border} ${zIndex}`;
  } else if (isLastInRow) {
    const border = isHighlighted
      ? `border-y border-r border-l-0 md:border-y-2 md:border-r-2 md:border-l-0 ${borderColor}`
      : "border-y border-r border-l-0 md:border-y-2 md:border-r-2 md:border-l-0 border-transparent";
    glowClasses = `${border} ${zIndex}`;
  } else {
    const border = isHighlighted
      ? `border-y border-x-0 md:border-y-2 md:border-x-0 ${borderColor}`
      : "border-y border-x-0 md:border-y-2 md:border-x-0 border-transparent";
    glowClasses = `${border} ${zIndex}`;
  }

  return (
    <div
      className={`@container box-border group/slotSegment flex items-center shrink-0 select-none overflow-visible ${roundedClasses} ${marginClasses} ${paddingClasses} ${className} ${glowClasses} relative hover:z-[50] group-hover/slotSegment:z-[50] ${
        isHovered ? "z-[50]" : ""
      } transition-all duration-150`}
      style={{
        backgroundColor,
        color: "#fff",
      }}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.(e as unknown as React.MouseEvent);
        }
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Floating 3-Button Quick-Vote Toolbar on Hover (visible on every segment below slot) */}
      {!isFinalized && meta.onQuickVote && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full pt-1 z-[100] hidden group-hover/slotSegment:flex items-center pointer-events-auto">
          <div className="flex items-center gap-1 p-1 rounded-full bg-popover/95 backdrop-blur-xl border border-border/80 shadow-2xl animate-in fade-in zoom-in-95 duration-100">
            {/* Tak / Yes Button */}
            <button
              type="button"
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                currentUserVote === "yes"
                  ? "bg-vote-yes text-white border border-vote-yes-border/60 shadow-sm hover:bg-vote-yes-hover scale-105"
                  : "bg-vote-yes-tint text-vote-yes-text hover:bg-vote-yes/30 border border-vote-yes-border/20 hover:border-vote-yes-border/50 hover:scale-105"
              }`}
              title={currentUserVote === "yes" ? "Cofnij głos" : "Głosuj na Tak"}
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
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                currentUserVote === "maybe"
                  ? "bg-vote-maybe text-white border border-vote-maybe-border/60 shadow-sm hover:bg-vote-maybe-hover scale-105"
                  : "bg-vote-maybe-tint text-vote-maybe-text hover:bg-vote-maybe/30 border border-vote-maybe-border/20 hover:border-vote-maybe-border/50 hover:scale-105"
              }`}
              title={currentUserVote === "maybe" ? "Cofnij głos" : "Głosuj na Może"}
              onClick={(e) => {
                e.stopPropagation();
                meta.onQuickVote?.(currentUserVote === "maybe" ? null : "maybe");
              }}
            >
              <span className="font-extrabold text-[12px] leading-none select-none">?</span>
            </button>

            {/* Nie / No Button */}
            <button
              type="button"
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                currentUserVote === "no"
                  ? "bg-vote-no text-white border border-vote-no-border/60 shadow-sm hover:bg-vote-no-hover scale-105"
                  : "bg-vote-no-tint text-vote-no-text hover:bg-vote-no/30 border border-vote-no-border/20 hover:border-vote-no-border/50 hover:scale-105"
              }`}
              title={currentUserVote === "no" ? "Cofnij głos" : "Głosuj na Nie"}
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

      <div className="flex items-center justify-between w-full min-w-0 max-w-full h-full gap-1 overflow-hidden">
        {/* Active Vote Badge in Slot: Shown on first slot or first in row if user has voted */}
        {(isFirstSegment || isFirstInRow) && !isFinalized && currentUserVote && (
          <button
            type="button"
            className={`shrink-0 p-0 border flex items-center justify-center w-[12px] h-[12px] md:w-[20px] md:h-[20px] rounded-full text-white font-bold cursor-pointer transition-all shadow-sm ${
              currentUserVote === "yes"
                ? "bg-vote-yes hover:bg-vote-yes-hover border-vote-yes-border/60"
                : currentUserVote === "maybe"
                  ? "bg-vote-maybe hover:bg-vote-maybe-hover border-vote-maybe-border/60"
                  : "bg-vote-no hover:bg-vote-no-hover border-vote-no-border/60"
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (meta.onQuickVote && !isFinalized) {
                meta.onQuickVote(null);
              }
            }}
            title="Kliknij, aby usunąć swój głos"
          >
            {currentUserVote === "yes" && <Check className="w-2.5 h-2.5 md:w-3 md:h-3 stroke-[3]" />}
            {currentUserVote === "maybe" && (
              <span className="font-extrabold text-[8px] md:text-[11px] leading-none select-none">?</span>
            )}
            {currentUserVote === "no" && <X className="w-2.5 h-2.5 md:w-3 md:h-3 stroke-[3]" />}
          </button>
        )}

        {/* Vote Counts Summary Badge */}
        {isFirstSegment && (
          <>
            {/* Below 1284px: Simple badge (Only "Tak" votes count) */}
            <div className="flex min-[1284px]:hidden items-center shrink-0 ml-auto">
              {yesVotes > 0 ? (
                <div className="shrink-0 px-0.5 py-0.5 md:px-1.5 md:py-0.5 rounded bg-black/45 md:bg-black/35 text-[9.5px] md:text-[10px] font-bold text-emerald-300 flex items-center gap-0.5 md:gap-1 leading-none tabular-nums">
                  <span className="text-[8.5px] md:text-[10px]">✓</span>
                  <span>{yesVotes}</span>
                </div>
              ) : null}
            </div>

            {/* From 1284px upwards: Compact vs Full via pure CSS Container Queries */}
            <div className="hidden min-[1284px]:flex items-center shrink-0 ml-auto">
              <div className="shrink-0 px-1.5 py-0.5 rounded bg-black/35 text-[10px] font-bold text-white/90 flex items-center gap-1.5 tabular-nums">
                {/* Compact badge (active when slot width < 120px) */}
                <div className="flex @[120px]:hidden items-center">
                  {yesVotes > 0 ? (
                    <span className="text-emerald-300 inline-flex items-center gap-0.5">
                      <span className="text-[10px]">✓</span>
                      <span>{yesVotes}/{totalParticipantsCount}</span>
                    </span>
                  ) : maybeVotes > 0 ? (
                    <span className="text-amber-300 inline-flex items-center gap-0.5">
                      <span className="text-[10px]">?</span>
                      <span>{maybeVotes}/{totalParticipantsCount}</span>
                    </span>
                  ) : noVotes > 0 ? (
                    <span className="text-rose-300 inline-flex items-center gap-0.5">
                      <span className="text-[10px]">✕</span>
                      <span>{noVotes}/{totalParticipantsCount}</span>
                    </span>
                  ) : (
                    <span className="text-white/60">0/{totalParticipantsCount}</span>
                  )}
                </div>

                {/* Full badge (active when slot width >= 120px) */}
                <div className="hidden @[120px]:flex items-center gap-1.5">
                  {yesVotes > 0 && (
                    <span className="text-emerald-300 inline-flex items-center gap-0.5">
                      <span className="text-[10px]">✓</span>
                      <span>{yesVotes}</span>
                    </span>
                  )}
                  {maybeVotes > 0 && (
                    <span className="text-amber-300 inline-flex items-center gap-0.5">
                      <span className="text-[10px]">?</span>
                      <span>{maybeVotes}</span>
                    </span>
                  )}
                  {noVotes > 0 && (
                    <span className="text-rose-300 inline-flex items-center gap-0.5">
                      <span className="text-[10px]">✕</span>
                      <span>{noVotes}</span>
                    </span>
                  )}
                  {totalVotesCast === 0 && <span className="text-white/60">0/{totalParticipantsCount}</span>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
