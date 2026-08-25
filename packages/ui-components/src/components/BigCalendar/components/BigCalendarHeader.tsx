import { format, type Locale } from "date-fns";
import { enUS, pl } from "date-fns/locale";
import type { TFunction } from "i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useUiTranslations } from "../../../hooks/useUiTranslations";
import { Button } from "../../ui/button";
import { BigCalendarView, CustomViewsMap } from "../types";
import { VIEWS } from "../utils/consts";
import { viewSwitcherButtonVariants } from "./BigCalendarHeader.styles";

type BigCalendarHeaderProps = {
  currentDate: Date;
  view: BigCalendarView | string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onViewChange?: (view: string) => void;
  views?: BigCalendarView[];
  hideViewSwitcher?: boolean;
  customViews?: CustomViewsMap;
  headerButtonContent?: React.ReactNode;
  headerRightContent?: React.ReactNode;
};

const formatTitle = (
  date: Date,
  view: BigCalendarView | string,
  dateLocale: Locale,
  t: TFunction,
): string => {
  if (view === "month" || view === "grid") {
    return format(date, "LLLL yyyy", { locale: dateLocale });
  }
  if (view === "week") {
    return t("calendar.weekOf", {
      date: format(date, "d MMM yyyy", { locale: dateLocale }),
    });
  }
  return format(date, "EEEE, d MMMM yyyy", { locale: dateLocale });
};

export const BigCalendarHeader = ({
  currentDate,
  view,
  onPrev,
  onNext,
  onToday,
  onViewChange,
  views,
  hideViewSwitcher = false,
  customViews,
  headerButtonContent,
  headerRightContent,
}: BigCalendarHeaderProps) => {
  const { t, i18n } = useUiTranslations();
  const dateLocale = i18n.language?.startsWith("pl") ? pl : enUS;

  const handleViewChange = (newView: string) => {
    if (onViewChange) {
      onViewChange(newView);
    }
  };

  const resolvedViews = views ?? (onViewChange ? VIEWS : [view as BigCalendarView]);

  const availableViews: { id: string; label: string }[] = [
    ...resolvedViews.map((v) => ({
      id: v,
      label: t(`calendar.views.${v}`),
    })),
    ...Object.entries(customViews || {}).map(([id, config]) => ({ id, label: config.label })),
  ];

  return (
    <div className="flex flex-row items-center justify-between p-2 sm:p-4 gap-1.5 sm:gap-4 border-b bg-card">
      {/* Left: Navigation */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <Button type="button" variant="outline" size="icon" className="h-7 w-7 sm:h-9 sm:w-9" onClick={onPrev}>
          <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" className="h-7 sm:h-9 px-1.5 sm:px-3 text-[11px] sm:text-sm" onClick={onToday}>
          {t("calendar.today")}
        </Button>
        <Button type="button" variant="outline" size="icon" className="h-7 w-7 sm:h-9 sm:w-9" onClick={onNext}>
          <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        {headerButtonContent}
      </div>

      {/* Center: Month/Title */}
      <span className="text-xs sm:text-lg font-bold tracking-tight text-center capitalize truncate px-1 flex-1 min-w-0">
        {formatTitle(currentDate, view, dateLocale, t)}
      </span>

      {/* Right: View Switcher / Custom actions */}
      {(!hideViewSwitcher && availableViews.length > 1) || headerRightContent ? (
        <div className="flex items-center justify-end gap-1 sm:gap-2 shrink-0">
          {headerRightContent}

          {!hideViewSwitcher && availableViews.length > 1 && (
            <div className="flex bg-muted/50 p-0.5 sm:p-1 rounded-lg">
              {availableViews.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={viewSwitcherButtonVariants({ isActive: view === item.id })}
                  onClick={() => handleViewChange(item.id)}
                >
                  <span className="sm:hidden">{item.label.substring(0, 1).toUpperCase()}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
