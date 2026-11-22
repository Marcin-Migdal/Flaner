import * as React from "react";
import { easeCubicInOut } from "d3-ease";
import { arc } from "d3-shape";
import { timer } from "d3-timer";
import { ChevronLeft } from "lucide-react";
import { cn } from "@flaner/shared/utils";
import { useUiTranslations } from "../../hooks/useUiTranslations";
import { chartFillClasses, type ChartColor } from "../ChartContainer/ChartContainer.styles";
import { Button } from "../ui/button";
import {
  arcTransitionStart,
  interpolateArcs,
  layoutArcs,
  type ArcAngleMap,
  type ArcTransition,
} from "../../utils/donutArcs";
import { donutChartStyles } from "./DonutChart.styles";

export type DonutChartSegment = {
  id: string;
  label: string;
  value: number;
  color: ChartColor;
  /** Segments shown after drilling into this one. */
  children?: DonutChartSegment[];
};

export type DonutChartProps = {
  /** Accessible name of the chart and caption of its hidden data table. */
  label: string;
  segments: DonutChartSegment[];
  formatValue: (value: number) => string;
  /** Id of the top-level segment whose children are shown; `null` / omitted shows the top level. */
  drilledId?: string | null;
  /** Drill into a segment with children (`id`) or back to the top level (`null`). */
  onDrillChange: (id: string | null) => void;
  /** Activating a segment without children (e.g. a subcategory). Without it such segments are not interactive. */
  onSegmentSelect?: (segment: DonutChartSegment) => void;
  /** Caption under the total in the middle (e.g. "Spent"). */
  totalLabel?: string;
  /** Text of the Back button shown while drilled in. */
  backLabel?: string;
  className?: string;
};

const RADIUS = 100;
const DURATION_MS = 450;
// Built per call, not at module level: a top-level call would keep d3 in every bundle that
// imports anything from ui-components.
const drawArc = (angles: { start: number; end: number }) =>
  arc()({ innerRadius: RADIUS * 0.62, outerRadius: RADIUS, startAngle: angles.start, endAngle: angles.end });

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Tween = {
  key: string;
  drilledId: string | null;
  from: ArcAngleMap;
  to: ArcAngleMap;
  progress: number;
};

const shownAngles = (tween: Tween) => interpolateArcs(tween.from, tween.to)(easeCubicInOut(tween.progress));

/**
 * Dumb donut with drill-down by id, meant to sit inside `ChartContainer`. D3 only does the
 * maths (layout, arc paths, tween timing); React renders the SVG. A drill-down opens the parent
 * slice into its children (Back reverses it); under `prefers-reduced-motion` it jumps instead.
 */
export function DonutChart({
  label,
  segments,
  formatValue,
  drilledId = null,
  onDrillChange,
  onSegmentSelect,
  totalLabel,
  backLabel,
  className,
}: DonutChartProps) {
  const { t, i18n } = useUiTranslations();
  const drilled = drilledId ? segments.find((segment) => segment.id === drilledId) : undefined;
  const shown = drilled?.children ?? segments;
  const total = shown.reduce((sum, segment) => sum + segment.value, 0);
  const key = `${drilled?.id ?? ""}|${shown.map((segment) => `${segment.id}:${segment.value}`).join(",")}`;

  // Restart the tween while rendering when the data changes, so the first frame already shows
  // where the transition starts (no flash of the end state).
  const [tween, setTween] = React.useState<Tween>(() => {
    const target = layoutArcs(shown);
    return { key, drilledId: drilled?.id ?? null, from: target, to: target, progress: 1 };
  });
  if (tween.key !== key) {
    const target = layoutArcs(shown);
    const nextDrilled = drilled?.id ?? null;
    const transition: ArcTransition =
      nextDrilled && nextDrilled !== tween.drilledId
        ? { drillInto: nextDrilled }
        : !nextDrilled && tween.drilledId
          ? { backFrom: tween.drilledId }
          : {};
    const reduce = prefersReducedMotion();
    setTween({
      key,
      drilledId: nextDrilled,
      from: reduce ? target : arcTransitionStart(shownAngles(tween), shown, transition),
      to: target,
      progress: reduce ? 1 : 0,
    });
  }

  const running = tween.progress < 1;
  React.useEffect(() => {
    if (!running) return;
    const frame = timer((elapsed) => {
      const progress = Math.min(1, elapsed / DURATION_MS);
      setTween((current) => ({ ...current, progress }));
      if (progress === 1) frame.stop();
    });
    return () => frame.stop();
  }, [running, tween.key]);

  // Keyboard focus follows the drill: into the first child, and back to the segment left.
  const focusAfterDrill = React.useRef<string | null>(null);
  const segmentRefs = React.useRef(new Map<string, SVGPathElement>());
  React.useEffect(() => {
    const id = focusAfterDrill.current;
    if (!id) return;
    focusAfterDrill.current = null;
    segmentRefs.current.get(id)?.focus();
  }, [drilled?.id]);

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const active = shown.find((segment) => segment.id === activeId);
  const percent = new Intl.NumberFormat(i18n.language, { style: "percent", maximumFractionDigits: 0 });
  const share = (value: number) => percent.format(total ? value / total : 0);

  const goBack = () => {
    focusAfterDrill.current = drilled?.id ?? null;
    onDrillChange(null);
  };
  const activate = (segment: DonutChartSegment) => {
    if (!drilled && segment.children?.length) {
      focusAfterDrill.current = segment.children[0].id;
      onDrillChange(segment.id);
    } else {
      onSegmentSelect?.(segment);
    }
  };
  const isInteractive = (segment: DonutChartSegment) =>
    (!drilled && Boolean(segment.children?.length)) || Boolean(onSegmentSelect);

  const angles = shownAngles(tween);

  return (
    <div className={cn(donutChartStyles.root, className)}>
      {drilled ? (
        <Button type="button" variant="ghost" size="sm" className={donutChartStyles.back} onClick={goBack}>
          <ChevronLeft aria-hidden="true" />
          {backLabel ?? t("chart.back")}
        </Button>
      ) : null}
      <div className={donutChartStyles.figure}>
        <svg
          role="graphics-document"
          aria-label={drilled ? `${label}: ${drilled.label}` : label}
          viewBox={`${-RADIUS} ${-RADIUS} ${RADIUS * 2} ${RADIUS * 2}`}
          className={donutChartStyles.svg}
        >
          <g role="graphics-object">
            {shown.map((segment) => {
              const segmentAngles = angles[segment.id];
              if (!segmentAngles) return null;
              const name = `${segment.label}: ${formatValue(segment.value)} (${share(segment.value)})`;
              const interactive = isInteractive(segment);
              const show = () => setActiveId(segment.id);
              const hide = () => setActiveId((current) => (current === segment.id ? null : current));
              return (
                <path
                  key={segment.id}
                  ref={(node) => {
                    if (node) segmentRefs.current.set(segment.id, node);
                    else segmentRefs.current.delete(segment.id);
                  }}
                  d={drawArc(segmentAngles) ?? undefined}
                  className={cn(
                    donutChartStyles.segment,
                    chartFillClasses[segment.color],
                    interactive && donutChartStyles.interactive,
                  )}
                  // Every segment is a tab stop (it shows its readout in the middle); only
                  // segments that drill in or can be selected act as buttons.
                  role={interactive ? "button" : "graphics-symbol"}
                  tabIndex={0}
                  aria-label={name}
                  onMouseEnter={show}
                  onMouseLeave={hide}
                  onFocus={show}
                  onBlur={hide}
                  onClick={interactive ? () => activate(segment) : undefined}
                  onKeyDown={(event) => {
                    if (interactive && (event.key === "Enter" || event.key === " ")) {
                      event.preventDefault();
                      activate(segment);
                    } else if (event.key === "Escape" && drilled) {
                      goBack();
                    }
                  }}
                />
              );
            })}
          </g>
        </svg>
        <div className={donutChartStyles.center} aria-hidden="true">
          <span className={donutChartStyles.centerLabel}>
            {active?.label ?? drilled?.label ?? totalLabel ?? t("chart.total")}
          </span>
          <span className={donutChartStyles.centerValue}>{formatValue(active?.value ?? total)}</span>
          {active ? <span className={donutChartStyles.centerShare}>{share(active.value)}</span> : null}
        </div>
      </div>
      <table className="sr-only">
        <caption>{drilled ? `${label}: ${drilled.label}` : label}</caption>
        <thead>
          <tr>
            <th scope="col">{t("chart.table.item")}</th>
            <th scope="col">{t("chart.table.value")}</th>
            <th scope="col">{t("chart.table.share")}</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((segment) => (
            <tr key={segment.id}>
              <th scope="row">{segment.label}</th>
              <td>{formatValue(segment.value)}</td>
              <td>{share(segment.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
