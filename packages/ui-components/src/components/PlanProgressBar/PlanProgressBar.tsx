import * as React from "react";
import { cn } from "@flaner/shared/utils";
import {
  planProgressBarFillVariants,
  planProgressBarTrackVariants,
  type PlanProgressBarSize,
  type PlanProgressBarTone,
} from "./PlanProgressBar.styles";

/** Index of a `--chart-N` colour token. */
export type PlanProgressBarColor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type PlanProgressBarProps = Omit<React.ComponentProps<"div">, "children" | "color"> & {
  /** The amount so far (e.g. spent). Any unit, as long as `max` uses the same. */
  value: number;
  /** The target (e.g. the limit). */
  max: number;
  /** Accessible name (e.g. the category). */
  label: string;
  /** Spoken value (e.g. "942.37 of 1,000.00 zł"); defaults to the numbers. */
  valueText?: string;
  /** Fill colour: a `--chart-N` index. */
  color?: PlanProgressBarColor;
  /** What the fill turns into above `max`: `danger` (spending over a limit) or `none` (income over plan). */
  overTone?: "danger" | "none";
  size?: PlanProgressBarSize;
};

/** Progress of an amount against its plan (spent vs limit). Dumb: the caller passes numbers, colour and labels. */
export function PlanProgressBar({
  value,
  max,
  label,
  valueText,
  color = 1,
  overTone = "danger",
  size,
  className,
  ...props
}: PlanProgressBarProps) {
  const isOver = value > max;
  const share = max > 0 ? Math.min(value / max, 1) : isOver ? 1 : 0;
  const tone: PlanProgressBarTone = isOver && overTone === "danger" ? "danger" : `chart-${color}`;

  return (
    <div
      data-slot="plan-progress-bar"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.min(Math.max(value, 0), max)}
      aria-valuetext={valueText}
      className={cn(planProgressBarTrackVariants({ size }), className)}
      {...props}
    >
      <div
        data-slot="plan-progress-bar-fill"
        data-tone={tone}
        className={planProgressBarFillVariants({ tone })}
        style={{ width: `${share * 100}%` }}
      />
    </div>
  );
}
