import { Popover, PopoverContent, PopoverTrigger, type CalendarEvent } from "@flaner/ui-components";
import { format } from "date-fns";
import { enUS, pl } from "date-fns/locale";
import { Check, HelpCircle, Minus } from "lucide-react";
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
          className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer px-1 mx-1 font-medium hover:bg-muted/50 rounded-md py-0.5 mt-0.5 transition-colors block text-left bg-transparent border-0"
          onClick={(e) => e.stopPropagation()}
        >
          +{events.length} {t("calendar.more")}
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
                          ? "bg-emerald-600 text-white border-emerald-500 shadow-md scale-105"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/30 hover:border-emerald-500/50 hover:scale-105"
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
                          ? "bg-amber-600 text-white border-amber-500 shadow-md scale-105"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/30 hover:border-amber-500/50 hover:scale-105"
                      }`}
                      title={t("voting.maybe")}
                      aria-label={t("voting.maybe")}
                      onClick={(e) => {
                        e.stopPropagation();
                        meta.onQuickVote?.(currentUserVote === "maybe" ? null : "maybe");
                      }}
                    >
                      <HelpCircle className="w-3.5 h-3.5 stroke-[3]" />
                    </button>

                    {/* No Button */}
                    <button
                      type="button"
                      className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                        currentUserVote === "no"
                          ? "bg-rose-600 text-white border-rose-500 shadow-md scale-105"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/30 hover:border-rose-500/50 hover:scale-105"
                      }`}
                      title={t("voting.no")}
                      aria-label={t("voting.no")}
                      onClick={(e) => {
                        e.stopPropagation();
                        meta.onQuickVote?.(currentUserVote === "no" ? null : "no");
                      }}
                    >
                      <Minus className="w-3.5 h-3.5 stroke-[3]" />
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
