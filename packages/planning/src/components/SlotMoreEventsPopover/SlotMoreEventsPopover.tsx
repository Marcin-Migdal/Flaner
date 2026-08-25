import { Popover, PopoverContent, PopoverTrigger, type CalendarEvent } from "@flaner/ui-components";
import { format } from "date-fns";
import { enUS, pl } from "date-fns/locale";
import { Check, X } from "lucide-react";
import type { SlotMetaData } from "../SlotEventComponent";
import {
  slotMoreEventsVoteButtonVariants,
  slotMoreEventsPopoverStyles,
} from "./SlotMoreEventsPopover.styles";
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
          className={slotMoreEventsPopoverStyles.triggerButton}
          onClick={(e) => e.stopPropagation()}
        >
          <span className="md:hidden">+{events.length}</span>
          <span className="hidden md:inline">+{events.length} {t("calendar.more")}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={slotMoreEventsPopoverStyles.content}
        align="start"
        side="bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={slotMoreEventsPopoverStyles.header}>
          {format(day, "d MMMM yyyy", { locale: dateLocale })}
        </div>
        <div className={slotMoreEventsPopoverStyles.list}>
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
                className={slotMoreEventsPopoverStyles.item}
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
                      className={slotMoreEventsVoteButtonVariants({
                        vote: "yes",
                        active: currentUserVote === "yes",
                      })}
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
                      className={slotMoreEventsVoteButtonVariants({
                        vote: "maybe",
                        active: currentUserVote === "maybe",
                      })}
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
                      className={slotMoreEventsVoteButtonVariants({
                        vote: "no",
                        active: currentUserVote === "no",
                      })}
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

