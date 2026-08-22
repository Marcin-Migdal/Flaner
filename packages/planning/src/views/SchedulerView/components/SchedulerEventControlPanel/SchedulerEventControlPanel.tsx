import { useAuth } from "@flaner/shared/context";
import { ConfirmationPopup } from "@flaner/ui-components";
import { useState } from "react";
import { useNavigate } from "react-router";
import type { SchedulerEvent } from "../../../../api/events/types";
import type { ParticipantResult } from "../../../../api/participants";
import { EventModal } from "../../../../components/EventModal";
import { FinalizeEventModal } from "../../../../components/FinalizeEventModal";
import { useDeleteEventMutation, useUnfinalizeEventMutation } from "../../../../hooks/api/mutation";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { SchedulerEventHeader } from "./SchedulerEventHeader";
import { SchedulerParticipantsList } from "./SchedulerParticipantsList";

export type SchedulerEventControlPanelProps = {
  events?: SchedulerEvent[];
  isEventsLoading: boolean;
  activeEvent: SchedulerEvent | null;
  participants?: ParticipantResult[];
  isParticipantsLoading: boolean;
};

export const SchedulerEventControlPanel = ({
  events,
  isEventsLoading,
  activeEvent,
  participants,
  isParticipantsLoading,
}: SchedulerEventControlPanelProps) => {
  const { t } = usePlanningTranslations();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { mutateAsync: deleteEvent, isPending: isDeletingEvent } = useDeleteEventMutation();
  const { mutateAsync: unfinalizeEvent, isPending: isUnfinalizingEvent } = useUnfinalizeEventMutation();

  const [eventToEdit, setEventToEdit] = useState<SchedulerEvent | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isReopenConfirmOpen, setIsReopenConfirmOpen] = useState(false);
  const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);

  const isOwner = !activeEvent?.creatorId || activeEvent.creatorId === user?.uid;

  const handleEditEvent = (event: SchedulerEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEventToEdit(event);
    setIsEventModalOpen(true);
  };

  const handleCreateEvent = () => {
    setEventToEdit(null);
    setIsEventModalOpen(true);
  };

  const handleSelectEvent = (eventId: string) => {
    navigate({ hash: eventId });
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    const eventId = eventToDelete.id;
    await deleteEvent(eventId, {
      onSuccess: () => {
        setEventToDelete(null);
        if (activeEvent?.id === eventId) {
          const remaining = events?.filter((ev) => ev.id !== eventId);
          if (remaining && remaining.length > 0) {
            navigate({ hash: remaining[0].id }, { replace: true });
          } else {
            navigate({ hash: "" }, { replace: true });
          }
        }
      },
    });
  };

  const handleConfirmReopen = async () => {
    if (!activeEvent) return;
    await unfinalizeEvent(
      { event: activeEvent },
      {
        onSuccess: () => {
          setIsReopenConfirmOpen(false);
        },
      },
    );
  };

  return (
    <div className="w-full min-[1200px]:w-[350px] relative shrink-0 rounded-3xl flex flex-col shadow-[20px_0_40px_-15px_rgba(0,0,0,0.5)]">
      {/* Ambient Glow Background - tylko dla lewego panelu */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 rounded-3xl">
        <div className="absolute -top-[20%] -left-[10%] w-[80%] h-[60%] rounded-full bg-brand/15 blur-[100px]" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[80%] h-[60%] rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      {/* Panel Glass Container */}
      <div className="relative z-10 w-full h-full flex flex-col rounded-3xl bg-card/60 backdrop-blur-2xl border border-white/10 dark:border-white/5 overflow-hidden">
        <SchedulerEventHeader
          events={events}
          isEventsLoading={isEventsLoading}
          activeEvent={activeEvent}
          currentUserId={user?.uid}
          isOwner={isOwner}
          onSelectEvent={handleSelectEvent}
          onEditEvent={handleEditEvent}
          onDeleteEvent={setEventToDelete}
          onCreateEventClick={handleCreateEvent}
          onFinalizeClick={() => setIsFinalizeModalOpen(true)}
          onReopenClick={() => setIsReopenConfirmOpen(true)}
        />

        <SchedulerParticipantsList
          participants={participants}
          isParticipantsLoading={isParticipantsLoading}
          activeEvent={activeEvent}
        />
      </div>

      <EventModal
        eventToEdit={eventToEdit}
        isOpen={isEventModalOpen}
        onOpenChange={(open) => {
          setIsEventModalOpen(open);
          if (!open) setEventToEdit(null);
        }}
      />

      {/* Finalize Event Modal for Creator */}
      {activeEvent && (
        <FinalizeEventModal
          open={isFinalizeModalOpen}
          onOpenChange={setIsFinalizeModalOpen}
          event={activeEvent}
          participantsProfiles={participants || []}
          currentUserId={user?.uid}
        />
      )}

      <ConfirmationPopup
        open={!!eventToDelete}
        onOpenChange={(open) => {
          if (!open) setEventToDelete(null);
        }}
        title={t("deleteModal.title")}
        description={t("deleteModal.description", { name: eventToDelete?.name })}
        confirmLabel={t("actions.delete")}
        cancelLabel={t("actions.cancel")}
        onConfirm={handleConfirmDelete}
        isConfirming={isDeletingEvent}
        variant="destructive"
      />

      <ConfirmationPopup
        open={isReopenConfirmOpen}
        onOpenChange={setIsReopenConfirmOpen}
        title={t("reopenConfirm.title")}
        description={t("reopenConfirm.description")}
        confirmLabel={t("actions.reopenVoting")}
        cancelLabel={t("actions.cancel")}
        onConfirm={handleConfirmReopen}
        isConfirming={isUnfinalizingEvent}
        variant="primary"
      />
    </div>
  );
};
