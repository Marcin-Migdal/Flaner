import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";

import { useGetEventParticipantsProfilesQuery } from "../../hooks/api/query/useGetEventParticipantsProfilesQuery";
import { useGetUserSchedulerEventsRealtimeQuery } from "../../hooks/api/query/useGetUserSchedulerEventsRealtimeQuery";

import { SchedulerCalendarPanel } from "./components/SchedulerCalendarPanel/SchedulerCalendarPanel";
import { SchedulerEventControlPanel } from "./components/SchedulerEventControlPanel/SchedulerEventControlPanel";

export const SchedulerView = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { data: events, isLoading: isEventsLoading } = useGetUserSchedulerEventsRealtimeQuery();

  const hashId = location.hash.replace("#", "");
  const activeEvent = events?.find((e) => e.id === hashId) || (events && events.length > 0 ? events[0] : null);

  // Sync hash with activeEvent if it wasn't there
  useEffect(() => {
    if (events && events.length > 0 && activeEvent) {
      if (location.hash !== `#${activeEvent.id}`) {
        navigate({ hash: activeEvent.id }, { replace: true });
      }
    }
  }, [events, location.hash, activeEvent, navigate]);

  const { data: participants = [], isLoading: isParticipantsLoading } = useGetEventParticipantsProfilesQuery(
    activeEvent?.participants || [],
  );

  return (
    <div className="flex flex-col min-[1200px]:flex-row h-auto min-[1200px]:h-[calc(100vh-6rem)] max-w-[1920px] mx-auto w-full bg-background overflow-y-auto min-[1200px]:overflow-hidden text-foreground p-0 sm:p-4 md:p-6 gap-3 sm:gap-4 min-[1200px]:gap-6">
      <SchedulerEventControlPanel
        events={events}
        isEventsLoading={isEventsLoading}
        activeEvent={activeEvent}
        participants={participants}
        isParticipantsLoading={isParticipantsLoading}
      />

      <SchedulerCalendarPanel
        activeEvent={activeEvent}
        participants={participants}
      />
    </div>
  );
};
