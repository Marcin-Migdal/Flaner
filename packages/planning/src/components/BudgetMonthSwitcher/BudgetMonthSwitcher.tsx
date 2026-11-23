import { Button, Popover, PopoverContent, PopoverTrigger } from "@flaner/ui-components";
import { addMonths, format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { BudgetMonth } from "../../api/budget";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { budgetMonthSwitcherStyles as styles } from "./BudgetMonthSwitcher.styles";

export type BudgetMonthSwitcherProps = {
  /** `YYYY-MM`. */
  month: BudgetMonth;
  onChange: (month: BudgetMonth) => void;
};

const toDate = (month: BudgetMonth) => parseISO(`${month}-01`);
const shift = (month: BudgetMonth, by: number): BudgetMonth => format(addMonths(toDate(month), by), "yyyy-MM");

/** One calendar month at a time: previous / next arrows and a month picker (year + 12 months). */
export const BudgetMonthSwitcher = ({ month, onChange }: BudgetMonthSwitcherProps) => {
  const { t, i18n } = usePlanningTranslations();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => toDate(month).getFullYear());
  const monthLabel = new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" });
  const shortMonth = new Intl.DateTimeFormat(i18n.language, { month: "short" });

  const pick = (monthIndex: number) => {
    onChange(`${year}-${String(monthIndex + 1).padStart(2, "0")}`);
    setOpen(false);
  };

  return (
    <div className={styles.root}>
      <Button variant="ghost" size="icon" aria-label={t("budget.monthSwitcher.previous")} onClick={() => onChange(shift(month, -1))}>
        <ChevronLeft aria-hidden="true" />
      </Button>

      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next) setYear(toDate(month).getFullYear());
          setOpen(next);
        }}
      >
        <PopoverTrigger asChild>
          <Button variant="ghost" className={styles.trigger} aria-label={t("budget.monthSwitcher.pick")}>
            {monthLabel.format(toDate(month))}
          </Button>
        </PopoverTrigger>
        <PopoverContent className={styles.popover}>
          <div className={styles.yearRow}>
            <Button variant="ghost" size="icon-sm" aria-label={t("budget.monthSwitcher.previousYear")} onClick={() => setYear(year - 1)}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <span className={styles.year}>{year}</span>
            <Button variant="ghost" size="icon-sm" aria-label={t("budget.monthSwitcher.nextYear")} onClick={() => setYear(year + 1)}>
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
          <div className={styles.months}>
            {Array.from({ length: 12 }, (_, index) => {
              const value = `${year}-${String(index + 1).padStart(2, "0")}`;
              return (
                <Button
                  key={value}
                  size="sm"
                  variant={value === month ? "brand" : "ghost"}
                  className={styles.month}
                  aria-pressed={value === month}
                  aria-label={monthLabel.format(new Date(year, index, 1))}
                  onClick={() => pick(index)}
                >
                  {shortMonth.format(new Date(year, index, 1))}
                </Button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      <Button variant="ghost" size="icon" aria-label={t("budget.monthSwitcher.next")} onClick={() => onChange(shift(month, 1))}>
        <ChevronRight aria-hidden="true" />
      </Button>
    </div>
  );
};
