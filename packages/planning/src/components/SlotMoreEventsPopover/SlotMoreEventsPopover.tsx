import { Popover, PopoverContent, PopoverTrigger, type CalendarEvent } from "@flaner/ui-components";
import { format } from "date-fns";
import { enUS, pl } from "date-fns/locale";
import { Check, X } from "lucide-react";
import type { SlotMetaData } from "../SlotEventComponent";

import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";

export type SlotMoreEventsPopoverProps = {
  events: CalendarEvent<SlotMetaData>[];
  day: Date;
  onSlotClick?: (event: CalendarEvent<SlotMetaData>) => void;
};

export function SlotMoreEventsPopover({
  events,
  day,
  onSlotClick,
}: SlotMoreEventsPopoverProps) {
  const { t, i18n } = usePlanningTranslations();
  const dateLocale = i18n.language?.startsWith("pl") ? pl : enUS;

  if (!events || events.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-[10px] md:text-[11px] text-muted-foreground hover:text-foreground cursor-pointer px-0.5 md:px-1 mx-0.5 md:mx-1 font-medium hover:bg-muted/50 rounded-md py-0.5 mt-0.5 transition-colors block text-left bg-transparent border-0"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="md:hidden">+{events.length}</span>
          <span className="hidden md:inline">+{events.length} {t("calendar.more")}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 sm:w-80 p-2 z-[70] shadow-xl border-border/60 bg-popover/95 backdrop-blur-md rounded-2xl"
        align="start"
        side="bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-xs font-bold px-1 text-muted-foreground/80 uppercase tracking-wider">
          {format(day, "d MMMM yyyy", { locale: dateLocale })}
        </div>
        <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-0.5">
          {events.map((ev, idx) => {
            const meta = ev.metaData;
            const votes = meta?.votes || {};
            const currentUserVote = meta?.currentUserId ? votes[meta.currentUserId] : undefined;

            const isSameDayRange = format(ev.start, "yyyy-MM-dd") === format(ev.end, "yyyy-MM-dd");
            const rangeText = isSameDayRange
              ? format(ev.start, "d MMM", { locale: dateLocale })
              : `${format(ev.start, "d MMM", { locale: dateLocale })} — ${format(ev.end, "d MMM", { locale: dateLocale })}`;

            return (
              <div
                key={`${ev.id}-${idx}`}
                className="flex items-center justify-between p-2 rounded-xl bg-background/60 border border-border/40 hover:border-border transition-all group/item"
              >
                {/* Event color & Date Range clickable area */}
                <button
                  type="button"
                  className="flex items-center gap-2 min-w-0 flex-1 mr-2 text-left bg-transparent border-0 p-0 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSlotClick?.(ev);
                  }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: ev.color || "var(--primary)" }}
                  />
                  <span className="text-xs font-semibold truncate group-hover/item:text-brand transition-colors">
                    {rangeText}
                  </span>
                </button>

                {/* 3 Quick-Vote Action Buttons: (+ / Yes, ? / Maybe, - / No) */}
                {meta?.onQuickVote && !meta?.isFinalized && (
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Yes Button */}
                    <button
                      type="button"
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                        currentUserVote === "yes"
                          ? "bg-vote-yes text-white border-vote-yes-border/60 shadow-md scale-105"
                          : "bg-vote-yes-tint text-vote-yes-text border-vote-yes-border/20 hover:bg-vote-yes/30 hover:border-vote-yes-border/50 hover:scale-105"
                      }`}
                      title={t("voting.yes")}
                      aria-label={t("voting.yes")}
                      onClick={(e) => {
                        e.stopPropagation();
                        meta.onQuickVote?.(currentUserVote === "yes" ? null : "yes");
                      }}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>

                    {/* Maybe Button */}
                    <button
                      type="button"
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                        currentUserVote === "maybe"
                          ? "bg-vote-maybe text-white border-vote-maybe-border/60 shadow-md scale-105"
                          : "bg-vote-maybe-tint text-vote-maybe-text border-vote-maybe-border/20 hover:bg-vote-maybe/30 hover:border-vote-maybe-border/50 hover:scale-105"
                      }`}
                      title={t("voting.maybe")}
                      aria-label={t("voting.maybe")}
                      onClick={(e) => {
                        e.stopPropagation();
                        meta.onQuickVote?.(currentUserVote === "maybe" ? null : "maybe");
                      }}
                    >
                      <span className="font-extrabold text-[12px] leading-none select-none">?</span>
                    </button>

                    {/* No Button */}
                    <button
                      type="button"
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                        currentUserVote === "no"
                          ? "bg-vote-no text-white border-vote-no-border/60 shadow-md scale-105"
                          : "bg-vote-no-tint text-vote-no-text border-vote-no-border/20 hover:bg-vote-no/30 hover:border-vote-no-border/50 hover:scale-105"
                      }`}
                      title={t("voting.no")}
                      aria-label={t("voting.no")}
                      onClick={(e) => {
                        e.stopPropagation();
                        meta.onQuickVote?.(currentUserVote === "no" ? null : "no");
                      }}
                    >
                      <X className="w-3.5 h-3.5 stroke-[3]" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
