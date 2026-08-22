import { useIsMobile } from "@flaner/shared/hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SchedulerEvent, VoteType } from "../../api/events/types";
import type { ParticipantResult } from "../../api/participants";
import {
  AvailabilityGridFooter,
  AvailabilityGridHeader,
  AvailabilityGridParticipant,
  AvailabilityGridWinnerHeader,
} from "./components";
import type { SlotStat } from "./types";

export type AvailabilityGridViewProps = {
  event: SchedulerEvent;
  participantsProfiles?: ParticipantResult[];
  currentUserId?: string;
  onVoteSlot?: (slotIndex: number, newVote: VoteType | null) => Promise<void>;
};

export const AvailabilityGridView = ({
  event,
  participantsProfiles = [],
  currentUserId,
  onVoteSlot,
}: AvailabilityGridViewProps) => {
  const isMobile = useIsMobile();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasHorizontalScroll, setHasHorizontalScroll] = useState(false);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const checkScroll = () => {
      setHasHorizontalScroll(el.scrollWidth > el.clientWidth);
    };

    checkScroll();
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);

    return () => resizeObserver.disconnect();
  }, [event.proposedDates.length, event.participants.length]);

  const participantMap = useMemo(() => {
    const map = new Map<string, ParticipantResult>();
    participantsProfiles.forEach((p) => {
      map.set(p.id, p);
    });
    return map;
  }, [participantsProfiles]);

  // Pre-calculate statistics for each slot
  const slotStats: SlotStat[] = useMemo(() => {
    return event.proposedDates.map((slot) => {
      const votes = slot.votes || {};
      let yesCount = 0;
      let maybeCount = 0;
      let noCount = 0;

      Object.values(votes).forEach((vote) => {
        if (vote === "yes") yesCount++;
        else if (vote === "maybe") maybeCount++;
        else if (vote === "no") noCount++;
      });

      const totalParticipants = Math.max(1, event.participants.length);
      const score = yesCount * 2 + maybeCount;
      const matchPercentage = Math.round((yesCount / totalParticipants) * 100);

      return {
        yesCount,
        maybeCount,
        noCount,
        score,
        matchPercentage,
      };
    });
  }, [event.proposedDates, event.participants.length]);

  const maxScore = useMemo(() => {
    return Math.max(0, ...slotStats.map((s) => s.score));
  }, [slotStats]);

  const userColWidth = isMobile ? "150px" : "minmax(160px, 200px)";
  const gridTemplateColumns = `${userColWidth} repeat(${event.proposedDates.length}, minmax(105px, 1fr))`;

  const handleVoteClick = async (slotIndex: number, clickedVote: "yes" | "maybe", currentVote?: VoteType) => {
    if (event.isFinalized || !onVoteSlot) return;
    const nextVote: VoteType | null = currentVote === clickedVote ? null : clickedVote;
    await onVoteSlot(slotIndex, nextVote);
  };

  return (
    <div className="w-full h-full overflow-auto p-3 sm:p-5 bg-background/50 flex flex-col gap-4">
      {/* Frame Container with Dynamic Corner Radius */}
      <div
        className={`w-full overflow-hidden border border-border/70 bg-card/60 backdrop-blur-xl shadow-xl transition-all duration-200 ${
          hasHorizontalScroll ? "rounded-t-2xl rounded-b-md" : "rounded-2xl"
        }`}
      >
        <div ref={scrollContainerRef} className="w-full overflow-x-auto">
          <div className="min-w-full w-max">
            {/* Dedicated Status / Finalized Winner Row in Header */}
            {event.isFinalized && (
              <AvailabilityGridWinnerHeader
                proposedDates={event.proposedDates}
                finalizedSlotIndex={event.finalizedSlotIndex}
                gridTemplateColumns={gridTemplateColumns}
              />
            )}

            {/* Header Row: Participant column + Slot columns */}
            <AvailabilityGridHeader
              proposedDates={event.proposedDates}
              participantsCount={event.participants.length}
              slotStats={slotStats}
              maxScore={maxScore}
              isFinalized={event.isFinalized}
              finalizedSlotIndex={event.finalizedSlotIndex}
              gridTemplateColumns={gridTemplateColumns}
            />

            {/* Rows: One per participant */}
            <div className="divide-y divide-border/40">
              {event.participants.map((uid) => (
                <AvailabilityGridParticipant
                  key={uid}
                  uid={uid}
                  profile={participantMap.get(uid)}
                  isCurrentUser={uid === currentUserId}
                  isCreator={uid === event.creatorId}
                  proposedDates={event.proposedDates}
                  isFinalized={event.isFinalized}
                  gridTemplateColumns={gridTemplateColumns}
                  onVoteClick={handleVoteClick}
                />
              ))}
            </div>

            {/* Footer Row: Summary & Match Percentage */}
            <AvailabilityGridFooter
              proposedDates={event.proposedDates}
              slotStats={slotStats}
              maxScore={maxScore}
              participantsCount={event.participants.length}
              gridTemplateColumns={gridTemplateColumns}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
