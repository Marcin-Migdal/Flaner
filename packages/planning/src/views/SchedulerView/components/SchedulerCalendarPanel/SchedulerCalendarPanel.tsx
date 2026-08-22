import { useAuth } from "@flaner/shared/context";
import { useMemo, useState } from "react";
import type { SchedulerEvent, VoteType } from "../../../../api/events/types";
import type { ParticipantResult } from "../../../../api/participants";
import { RankedSlotsSheet } from "../../../../components/RankedSlotsSheet";
import { SlotVotingModal } from "../../../../components/SlotVotingModal/SlotVotingModal";
import { useVoteSlotMutation } from "../../../../hooks/api/mutation";
import { SchedulerBigCalendar } from "./SchedulerBigCalendar";
import { SchedulerEmptyState } from "./SchedulerEmptyState";

export type SchedulerCalendarPanelProps = {
  activeEvent: SchedulerEvent | null;
  participants: ParticipantResult[];
};

export const SchedulerCalendarPanel = ({
  activeEvent,
  participants,
}: SchedulerCalendarPanelProps) => {
  const { user } = useAuth();
  const { mutateAsync: voteSlot } = useVoteSlotMutation();

  const [currentCalendarView, setCurrentCalendarView] = useState<string>("month");
  const [votingSlotIndex, setVotingSlotIndex] = useState<number | null>(null);
  const [isRankedSheetOpen, setIsRankedSheetOpen] = useState(false);

  // Calculate all slots tied for #1 top-voted
  const topVotedSlotIndices = useMemo(() => {
    if (!activeEvent || activeEvent.proposedDates.length === 0) return new Set<number>();
    let maxScore = 0;
    let bestYes = 0;

    activeEvent.proposedDates.forEach((slot) => {
      const votes = slot.votes || {};
      const yes = Object.values(votes).filter((v) => v === "yes").length;
      const maybe = Object.values(votes).filter((v) => v === "maybe").length;
      const score = yes * 1.0 + maybe * 0.5;

      if (score > maxScore || (score === maxScore && yes > bestYes)) {
        maxScore = score;
        bestYes = yes;
      }
    });

    if (maxScore === 0) return new Set<number>();

    const topIndices = new Set<number>();
    activeEvent.proposedDates.forEach((slot, index) => {
      const votes = slot.votes || {};
      const yes = Object.values(votes).filter((v) => v === "yes").length;
      const maybe = Object.values(votes).filter((v) => v === "maybe").length;
      const score = yes * 1.0 + maybe * 0.5;

      if (score === maxScore && yes === bestYes) {
        topIndices.add(index);
      }
    });

    return topIndices;
  }, [activeEvent]);

  const handleVoteSlot = async (slotIndex: number, newVote: VoteType | null) => {
    if (user?.uid && activeEvent && !activeEvent.isFinalized) {
      await voteSlot({
        eventId: activeEvent.id,
        slotIndex,
        userId: user.uid,
        vote: newVote,
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col relative z-10 min-w-0 min-h-[500px] min-[1200px]:min-h-0">
      <div className="flex-1 w-full h-full flex flex-col overflow-hidden relative min-h-0">
        {activeEvent ? (
          <SchedulerBigCalendar
            activeEvent={activeEvent}
            participants={participants}
            currentUserId={user?.uid}
            topVotedSlotIndices={topVotedSlotIndices}
            currentCalendarView={currentCalendarView}
            onViewChange={setCurrentCalendarView}
            onVoteSlot={handleVoteSlot}
            onSlotClick={setVotingSlotIndex}
            onOpenRankedSheet={() => setIsRankedSheetOpen(true)}
          />
        ) : (
          <SchedulerEmptyState />
        )}
      </div>

      <SlotVotingModal
        isOpen={votingSlotIndex !== null}
        onOpenChange={(open) => {
          if (!open) setVotingSlotIndex(null);
        }}
        event={activeEvent}
        slotIndex={votingSlotIndex}
        participantsProfiles={participants}
        currentUserId={user?.uid}
      />

      {/* Ranked Slots Flyout Sheet from Right */}
      {activeEvent && (
        <RankedSlotsSheet
          open={isRankedSheetOpen}
          onOpenChange={setIsRankedSheetOpen}
          event={activeEvent}
          participantsProfiles={participants}
          currentUserId={user?.uid}
          onVoteSlot={handleVoteSlot}
        />
      )}
    </div>
  );
};
