import { BigCalendar, Button } from "@flaner/ui-components";
import { parseISO } from "date-fns";
import { ListSortDescending } from "lucide-react";
import { useEffect, useState } from "react";
import { useIsMobile } from "@flaner/shared/hooks";
import type { SchedulerEvent, VoteType } from "../../../../api/events/types";
import type { ParticipantResult } from "../../../../api/participants";
import { AvailabilityGridView } from "../../../../components/AvailabilityGridView";
import { SlotEventComponent } from "../../../../components/SlotEventComponent";
import { SlotMoreEventsPopover } from "../../../../components/SlotMoreEventsPopover";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";

export type SchedulerBigCalendarProps = {
  activeEvent: SchedulerEvent;
  participants: ParticipantResult[];
  currentUserId?: string;
  topVotedSlotIndices: Set<number>;
  currentCalendarView: string;
  onViewChange: (view: string) => void;
  onVoteSlot: (slotIndex: number, newVote: VoteType | null) => Promise<void>;
  onSlotClick: (slotIndex: number) => void;
  onOpenRankedSheet: () => void;
};

const MD_TABLET_HEIGHT = 1200;

export const SchedulerBigCalendar = ({
  activeEvent,
  participants,
  currentUserId,
  topVotedSlotIndices,
  currentCalendarView,
  onViewChange,
  onVoteSlot,
  onSlotClick,
  onOpenRankedSheet,
}: SchedulerBigCalendarProps) => {
  const { t } = usePlanningTranslations();
  const isMobile = useIsMobile();

  const [isTabletHeight, setIsTabletHeight] = useState<boolean>(() => {
    return typeof window !== "undefined" ? window.innerHeight <= MD_TABLET_HEIGHT : true;
  });

  useEffect(() => {
    const mql = window.matchMedia(`(max-height: ${MD_TABLET_HEIGHT}px)`);
    const onChange = () => setIsTabletHeight(window.innerHeight <= MD_TABLET_HEIGHT);

    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const maxEventsPerDay = isMobile ? 2 : isTabletHeight ? 3 : 4;

  return (
    <BigCalendar
      fitContainer
      view={currentCalendarView}
      onViewChange={onViewChange}
      views={["month"]}
      slotSize="lg"
      headerRightContent={
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 sm:h-9 sm:w-9 bg-background hover:bg-accent rounded-lg border border-border shadow-sm text-foreground"
          onClick={onOpenRankedSheet}
          title={t("ranking.title")}
        >
          <ListSortDescending className="h-4 w-4 text-foreground" />
        </Button>
      }
      customViews={{
        grid: {
          label: t("views.grid"),
          render: () => (
            <AvailabilityGridView
              event={activeEvent}
              participantsProfiles={participants}
              currentUserId={currentUserId}
              onVoteSlot={onVoteSlot}
            />
          ),
        },
      }}
      events={activeEvent.proposedDates.map((d, index) => ({
        id: index.toString(),
        title: activeEvent.name,
        start: parseISO(d.start),
        end: parseISO(d.end),
        color: d.color,
        metaData: {
          slotIndex: index,
          votes: d.votes || {},
          totalParticipantsCount: activeEvent.participants.length,
          participantsProfiles: participants,
          currentUserId,
          isTopVoted: topVotedSlotIndices.has(index),
          isFinalized: activeEvent.isFinalized,
          isWinningSlot: activeEvent.isFinalized && activeEvent.finalizedSlotIndex === index,
          onQuickVote: async (newVote: VoteType | null) => {
            await onVoteSlot(index, newVote);
          },
        },
      }))}
      renderEvent={SlotEventComponent}
      maxEventsPerDay={maxEventsPerDay}
      renderMoreEvents={(hiddenEvents, day) => (
        <SlotMoreEventsPopover
          events={hiddenEvents}
          day={day}
          onSlotClick={(calEv) => {
            onSlotClick(parseInt(calEv.id as string, 10));
          }}
        />
      )}
      onEventClick={(calEv) => {
        onSlotClick(parseInt(calEv.id as string, 10));
      }}
    />
  );
};
