import { Check, HelpCircle, Plus, Minus } from "lucide-react";
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
    isFirstEventSlot: _isFirstEventSlot,
    isLastEventSlot: _isLastEventSlot,
    isFirstInRow = props.isFirstEventSlot,
    isLastInRow = props.isLastEventSlot,
    continuesNextInRow = !props.isLastEventSlot,
  } = props;
  const meta = event.metaData;

  const roundedClasses =
    isFirstInRow && isLastInRow
      ? "rounded-md"
      : isFirstInRow
        ? "rounded-l-md rounded-r-none"
        : isLastInRow
          ? "rounded-r-md rounded-l-none"
          : "rounded-none";

  const marginClasses = continuesNextInRow
    ? "w-[calc(100%+1px)] -mr-[1px] relative z-[1]"
    : "w-full";

  const paddingClasses = `${
    isFirstInRow && isLastInRow
      ? "px-1.5"
      : isFirstInRow
        ? "pl-1.5 pr-0.5"
        : isLastInRow
          ? "pl-0.5 pr-1.5"
          : "px-0"
  }`;

  if (!meta) {
    return (
      <div
        className={`box-border ${className} ${roundedClasses} ${marginClasses} ${paddingClasses} ${
          isHovered ? "brightness-110" : ""
        } flex items-center select-none truncate cursor-pointer overflow-hidden transition-all duration-150`}
        style={{ backgroundColor: event.color || "var(--primary)", color: "#fff" }}
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

  const score = yesVotes + maybeVotes * 0.5;
  const ratio = score / Math.max(1, totalParticipantsCount);
  const opacityPercentage = Math.round(Math.max(0.45, Math.min(1, 0.45 + ratio * 0.55)) * 100);
  const baseColor = event.color || "var(--primary)";
  const backgroundColor = `color-mix(in srgb, ${baseColor} ${opacityPercentage}%, #141414)`;

  const currentUserVote = currentUserId ? votes[currentUserId] : undefined;

  let glowClasses = "";
  const isHighlighted = isWinningSlot || isTopVoted;
  const borderColor = isWinningSlot
    ? "border-emerald-400"
    : "border-amber-400 dark:border-amber-300";

  const zIndex = isWinningSlot ? "z-20" : isTopVoted ? "z-10" : "z-0";

  if (isFirstInRow && isLastInRow) {
    // Single-day slot: all 4 borders
    const border = isHighlighted ? `border-2 ${borderColor}` : "border-2 border-transparent";
    glowClasses = `${border} ${zIndex}`;
  } else if (isFirstInRow) {
    // Start of row slot chunk: top, bottom, and left borders
    const border = isHighlighted
      ? `border-y-2 border-l-2 border-r-0 ${borderColor}`
      : "border-y-2 border-l-2 border-r-0 border-transparent";
    glowClasses = `${border} ${zIndex}`;
  } else if (isLastInRow) {
    // End of row slot chunk: top, bottom, and right borders
    const border = isHighlighted
      ? `border-y-2 border-r-2 border-l-0 ${borderColor}`
      : "border-y-2 border-r-2 border-l-0 border-transparent";
    glowClasses = `${border} ${zIndex}`;
  } else {
    // Middle of row slot chunk: top and bottom borders only (continuous line)
    const border = isHighlighted
      ? `border-y-2 border-x-0 ${borderColor}`
      : "border-y-2 border-x-0 border-transparent";
    glowClasses = `${border} ${zIndex}`;
  }

  return (
    <div
      className={`box-border flex items-center shrink-0 select-none overflow-hidden ${roundedClasses} ${marginClasses} ${paddingClasses} ${className} ${glowClasses} ${
        isHovered ? "brightness-110" : ""
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
      <div className="flex items-center justify-between w-full min-w-0 max-w-full h-full gap-1 overflow-hidden">
        {props.isFirstEventSlot && !isFinalized && (
          <div className="flex items-center gap-1 shrink-0">
            {/* Button 1: Tak / Nie toggle */}
            <button
              type="button"
              className="shrink-0 p-0 border-0 flex items-center justify-center w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] rounded-full bg-black/30 hover:bg-black/50 text-white text-[9px] sm:text-[10px] font-bold cursor-pointer transition-colors group/voteYes"
              onClick={(e) => {
                e.stopPropagation();
                if (meta.onQuickVote && !isFinalized) {
                  meta.onQuickVote(currentUserVote === "yes" ? null : "yes");
                }
              }}
              title={currentUserVote === "yes" ? "Cofnij głos" : "Głosuj na Tak"}
            >
              {currentUserVote === "yes" ? (
                <>
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 stroke-[3] group-hover/voteYes:hidden" />
                  <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 stroke-[3] hidden group-hover/voteYes:block" />
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/90 group-hover/voteYes:hidden" />
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-300 stroke-[3] hidden group-hover/voteYes:block" />
                </>
              )}
            </button>

            {/* Button 2: Może toggle (visible only on >= 1400px screens) */}
            <button
              type="button"
              className="shrink-0 p-0 border-0 items-center justify-center w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] rounded-full bg-black/30 hover:bg-black/50 text-white text-[9px] sm:text-[10px] font-bold cursor-pointer transition-colors group/voteMaybe hidden min-[1400px]:flex"
              onClick={(e) => {
                e.stopPropagation();
                if (meta.onQuickVote && !isFinalized) {
                  meta.onQuickVote(currentUserVote === "maybe" ? null : "maybe");
                }
              }}
              title={currentUserVote === "maybe" ? "Cofnij głos" : "Głosuj na Może"}
            >
              {currentUserVote === "maybe" ? (
                <>
                  <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 stroke-[3] group-hover/voteMaybe:hidden" />
                  <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 stroke-[3] hidden group-hover/voteMaybe:block" />
                </>
              ) : (
                <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/70 group-hover/voteMaybe:text-amber-300 stroke-[2.5]" />
              )}
            </button>
          </div>
        )}

        {props.isFirstEventSlot && (
          <div className="flex items-center gap-1 shrink-0 ml-auto overflow-hidden">
            {/* Vote Counts Badge */}
            <div className="shrink-0 px-1 sm:px-1.5 py-0.5 rounded bg-black/30 text-[9px] sm:text-[10px] font-semibold text-white/90 flex items-center gap-0.5 sm:gap-1">
              {yesVotes > 0 && <span className="text-emerald-300">✓{yesVotes}</span>}
              {maybeVotes > 0 && <span className="text-amber-300">?{maybeVotes}</span>}
              {yesVotes === 0 && maybeVotes === 0 && <span className="text-white/60">0/{totalParticipantsCount}</span>}
            </div>
          </div>
        )}
    </div>
  </div>
  );
}
