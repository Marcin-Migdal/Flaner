import { useAuth } from "@flaner/shared/context";
import { useMemo, useState } from "react";
import { getSlotKey, type SchedulerEvent, type VoteType } from "../../../../api/events/types";
import type { ParticipantResult } from "../../../../api/participants";
import { RankedSlotsSheet } from "../../../../components/RankedSlotsSheet";
import { SlotVotingModal } from "../../../../components/SlotVotingModal/SlotVotingModal";
import { useVoteSlotMutation } from "../../../../hooks/api/mutation";
import { rankSlots } from "../../../../utils/slotRanking";
import { SchedulerBigCalendar } from "./components/SchedulerBigCalendar";
import { SchedulerEmptyState } from "./components/SchedulerEmptyState";

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

  const topVotedSlotIndices = useMemo(
    () => (activeEvent ? rankSlots(activeEvent).topSlotIndices : new Set<number>()),
    [activeEvent],
  );

  const handleVoteSlot = async (slotIndex: number, newVote: VoteType | null) => {
    const slot = activeEvent?.proposedDates[slotIndex];
    if (user?.uid && activeEvent && slot && !activeEvent.isFinalized) {
      await voteSlot({
        eventId: activeEvent.id,
        slotKey: getSlotKey(slot),
        userId: user.uid,
        vote: newVote,
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col relative z-10 min-w-0 min-h-[500px] split:min-h-0">
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
            onSlotClick={(slotIndex) => {
              // A finalized event is read-only; its results stay available in the ranked sheet
              if (!activeEvent.isFinalized) setVotingSlotIndex(slotIndex);
            }}
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
