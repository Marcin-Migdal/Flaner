import { Button, Select, type SelectOption } from "@flaner/ui-components";
import { CheckCircle, Pencil, Plus, Trash2 } from "lucide-react";
import type { SchedulerEvent } from "../../../../api/events/types";
import { FinalizedDateCard } from "../../../../components/FinalizedDateCard";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";

export type SchedulerEventHeaderProps = {
  events?: SchedulerEvent[];
  isEventsLoading: boolean;
  activeEvent: SchedulerEvent | null;
  currentUserId?: string;
  isOwner: boolean;
  onSelectEvent: (eventId: string) => void;
  onEditEvent: (event: SchedulerEvent, e: React.MouseEvent) => void;
  onDeleteEvent: (event: { id: string; name: string }) => void;
  onCreateEventClick: () => void;
  onFinalizeClick: () => void;
  onReopenClick: () => void;
};

export const SchedulerEventHeader = ({
  events,
  isEventsLoading,
  activeEvent,
  currentUserId,
  isOwner,
  onSelectEvent,
  onEditEvent,
  onDeleteEvent,
  onCreateEventClick,
  onFinalizeClick,
  onReopenClick,
}: SchedulerEventHeaderProps) => {
  const { t } = usePlanningTranslations();

  return (
    <div className="px-4 pt-4 pb-2 flex flex-col">
      <h3 className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-widest mb-3 px-1">
        {t("hub.event")}
      </h3>
      <div className="flex gap-1.5 md:gap-3 items-center">
        <div className="flex-1 min-w-0">
          {isEventsLoading ? (
            <div className="h-9 md:h-10 bg-white/5 rounded-xl animate-pulse" />
          ) : events && events.length > 0 ? (
            <Select
              variant="glass"
              value={activeEvent ? { label: activeEvent.name, value: activeEvent.id } : null}
              onChange={(val: SelectOption | null) => val && onSelectEvent(val.value)}
              options={events.map((e) => ({ label: e.name, value: e.id, rawEvent: e }))}
              placeholder={t("hub.selectEvent")}
              containerClassName="w-full"
              isSearchable={events.length > 8}
              formatOptionLabel={(option: SelectOption & { rawEvent?: SchedulerEvent }, { context }) => {
                const rawEvent = option.rawEvent;
                const isEventOwner = !rawEvent?.creatorId || rawEvent.creatorId === currentUserId;
                if (context === "menu") {
                  return (
                    <div className="flex items-center justify-between w-full min-w-0">
                      <span className="truncate flex-1 text-left">{option.label}</span>
                      {isEventOwner && (
                        <div className="hidden md:flex opacity-0 group-hover:opacity-100 items-center gap-1 shrink-0 ml-2 transition-all duration-200">
                          <button
                            type="button"
                            onClick={(e) => rawEvent && onEditEvent(rawEvent, e)}
                            className="hover:bg-white/10 hover:text-foreground text-muted-foreground p-1 rounded-lg transition-colors"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              if (rawEvent) {
                                onDeleteEvent({ id: rawEvent.id, name: rawEvent.name });
                              }
                            }}
                            className="hover:bg-destructive/20 hover:text-destructive text-muted-foreground p-1 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                }
                return <span className="truncate">{option.label}</span>;
              }}
            />
          ) : (
            <div className="h-9 md:h-10 flex items-center px-4 text-sm text-muted-foreground bg-white/5 border border-white/5 rounded-xl">
              {t("hub.noEvents")}
            </div>
          )}
        </div>

        {activeEvent && isOwner && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={(e) => onEditEvent(activeEvent, e)}
              className="md:hidden shrink-0 size-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-muted-foreground hover:text-foreground active:scale-95 flex items-center justify-center"
              title={t("actions.edit")}
            >
              <Pencil className="size-3.5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onDeleteEvent({ id: activeEvent.id, name: activeEvent.name })}
              className="md:hidden shrink-0 size-9 rounded-xl bg-white/5 hover:bg-destructive/20 border border-white/5 transition-all text-muted-foreground hover:text-destructive active:scale-95 flex items-center justify-center"
              title={t("actions.delete")}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCreateEventClick}
          className="shrink-0 size-9 md:size-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-muted-foreground hover:text-foreground hover:scale-105 active:scale-95 flex items-center justify-center"
          title={t("hub.addEvent")}
        >
          <Plus className="size-4 md:size-5" />
        </Button>
      </div>

      {/* Finalization Section: Finalized card OR Creator action button */}
      {activeEvent && (
        <div className="mt-3">
          {activeEvent.isFinalized ? (
            <FinalizedDateCard
              event={activeEvent}
              isOwner={isOwner}
              onReopen={onReopenClick}
            />
          ) : isOwner ? (
            <Button
              variant="outline"
              className="w-full h-10 rounded-xl bg-brand/15 hover:bg-brand/25 border-brand/40 text-brand font-semibold text-xs tracking-wide uppercase gap-2 transition-all hover:scale-[1.01] shadow-sm"
              onClick={onFinalizeClick}
            >
              <CheckCircle className="w-4 h-4 text-brand" />
              <span>{t("actions.finalizeEvent")}</span>
            </Button>
          ) : null}
        </div>
      )}

      {activeEvent?.description && (
        <p className="mt-3 px-1 text-xs text-muted-foreground/80 leading-relaxed break-words">
          {activeEvent.description}
        </p>
      )}
    </div>
  );
};
