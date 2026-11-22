import { ticks } from "d3-array";
import { scaleBand } from "d3-scale";
import { cn } from "@flaner/shared/utils";
import { useUiTranslations } from "../../hooks/useUiTranslations";
import { chartFillClasses, type ChartColor } from "../ChartContainer/ChartContainer.styles";
import { barChartStyles } from "./BarChart.styles";

export type BarChartSeries = { id: string; label: string; color: ChartColor };

export type BarChartGroup = {
  id: string;
  label: string;
  /** Value per series id; a missing value draws no bar. */
  values: Record<string, number>;
};

export type BarChartProps = {
  /** Accessible name of the chart and caption of its hidden data table. */
  label: string;
  groups: BarChartGroup[];
  series: BarChartSeries[];
  formatValue: (value: number) => string;
  /** Group drawn on a highlighted band, with the other groups' bars dimmed (e.g. the chosen month). */
  highlightedId?: string;
  className?: string;
};

const percent = (value: number) => `${value}%`;

/**
 * Dumb grouped bar chart (e.g. income vs expenses per month), meant to sit inside
 * `ChartContainer` with the series in its legend. Geometry is in percentages, so it fills its
 * container without measuring it; D3 only computes the scales.
 */
export function BarChart({ label, groups, series, formatValue, highlightedId, className }: BarChartProps) {
  const { t } = useUiTranslations();
  const max = Math.max(0, ...groups.flatMap((group) => series.map((item) => group.values[item.id] ?? 0)));
  const x = scaleBand()
    .domain(groups.map((group) => group.id))
    .range([0, 100])
    .paddingInner(0.3)
    .paddingOuter(0.15);
  const inner = scaleBand()
    .domain(series.map((item) => item.id))
    .range([0, x.bandwidth()])
    .paddingInner(0.1);
  // Value → % of the plot height (scaleLinear would pull d3-interpolate / d3-format in).
  const y = (value: number) => (max ? (value / max) * 100 : 0);
  const step = x.step();

  return (
    <div className={cn(barChartStyles.root, className)}>
      <svg role="graphics-document" aria-label={label} className={barChartStyles.svg}>
        {ticks(0, max, 4).map((tick) => (
          <line
            key={tick}
            x1="0"
            x2="100%"
            y1={percent(100 - y(tick))}
            y2={percent(100 - y(tick))}
            className={barChartStyles.grid}
            aria-hidden="true"
          />
        ))}
        {groups.map((group) => {
          const groupX = x(group.id) ?? 0;
          return (
            <g key={group.id} role="graphics-object" aria-label={group.label}>
              {group.id === highlightedId ? (
                <rect
                  x={percent(groupX - (step - x.bandwidth()) / 2)}
                  width={percent(step)}
                  y="0"
                  height="100%"
                  rx="6"
                  className={barChartStyles.highlight}
                  aria-hidden="true"
                />
              ) : null}
              {series.map((item) => {
                const value = group.values[item.id];
                if (value === undefined) return null;
                const height = y(value);
                return (
                  <rect
                    key={item.id}
                    role="graphics-symbol"
                    aria-label={`${group.label}, ${item.label}: ${formatValue(value)}`}
                    x={percent(groupX + (inner(item.id) ?? 0))}
                    width={percent(inner.bandwidth())}
                    y={percent(100 - height)}
                    height={percent(height)}
                    rx="2"
                    className={cn(
                      chartFillClasses[item.color],
                      highlightedId !== undefined && group.id !== highlightedId && barChartStyles.dimmed,
                    )}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className={barChartStyles.labels} aria-hidden="true">
        {groups.map((group) => (
          <span
            key={group.id}
            className={cn(barChartStyles.label, group.id === highlightedId && barChartStyles.labelHighlighted)}
            style={{ left: percent((x(group.id) ?? 0) + x.bandwidth() / 2) }}
          >
            {group.label}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">{t("chart.table.item")}</th>
            {series.map((item) => (
              <th key={item.id} scope="col">
                {item.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.id}>
              <th scope="row" aria-current={group.id === highlightedId ? "true" : undefined}>
                {group.label}
              </th>
              {series.map((item) => {
                const value = group.values[item.id];
                return <td key={item.id}>{value === undefined ? "" : formatValue(value)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
