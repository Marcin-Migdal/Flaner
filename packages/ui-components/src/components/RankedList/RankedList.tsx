import * as React from "react";
import { cn } from "@flaner/shared/utils";
import { useUiTranslations } from "../../hooks/useUiTranslations";
import { chartBgClasses, chartSwatchVariants, type ChartColor } from "../ChartContainer/ChartContainer.styles";
import { rankedListStyles } from "./RankedList.styles";

export type RankedListItem = {
  id: string;
  label: string;
  value: number;
  color: ChartColor;
  /** Replaces the colour dot (e.g. a category icon). */
  icon?: React.ReactNode;
};

export type RankedListProps = {
  /** Accessible name of the list. */
  label: string;
  /** Shown in the given order (rank them before passing; keep "Others" last). */
  items: RankedListItem[];
  formatValue: (value: number) => string;
  /** Makes rows buttons (e.g. drill into the same category as the donut). */
  onSelect?: (id: string) => void;
  className?: string;
};

/** Ranked breakdown next to a chart: share bar, amount and percent of the total per item. */
export function RankedList({ label, items, formatValue, onSelect, className }: RankedListProps) {
  const { i18n } = useUiTranslations();
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });

  return (
    <ul aria-label={label} className={cn(rankedListStyles.list, className)}>
      {items.map((item) => {
        const share = total ? item.value / total : 0;
        const content = (
          <>
            <span className={rankedListStyles.line}>
              <span className={rankedListStyles.marker} aria-hidden="true">
                {item.icon ?? <span className={chartSwatchVariants({ color: item.color })} />}
              </span>
              <span className={rankedListStyles.label}>{item.label}</span>
              <span className={rankedListStyles.value}>{formatValue(item.value)}</span>
              <span className={rankedListStyles.share}>{percent.format(share)}</span>
            </span>
            <span
              role="meter"
              aria-label={item.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(share * 100)}
              className={rankedListStyles.track}
            >
              <span
                className={cn(rankedListStyles.fill, chartBgClasses[item.color])}
                style={{ width: `${share * 100}%` }}
              />
            </span>
          </>
        );
        return (
          <li key={item.id}>
            {onSelect ? (
              <button
                type="button"
                className={cn(rankedListStyles.row, rankedListStyles.button)}
                onClick={() => onSelect(item.id)}
              >
                {content}
              </button>
            ) : (
              <div className={rankedListStyles.row}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
