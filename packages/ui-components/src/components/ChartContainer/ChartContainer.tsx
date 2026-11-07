import * as React from "react";
import { cn } from "@flaner/shared/utils";
import { Card, type CardProps } from "../Card";
import { chartContainerStyles, chartSwatchVariants, type ChartColor } from "./ChartContainer.styles";

export type ChartLegendItem = {
  id: string;
  label: React.ReactNode;
  color: ChartColor;
};

export type ChartContainerProps = Omit<CardProps, "title"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  legend?: ChartLegendItem[];
  /** Height of the chart area; the chart itself (D3, SVG…) fills it. */
  bodyClassName?: string;
};

/**
 * Frame for data visualisations: title, optional actions and a legend driven by the
 * `chart-*` tokens. Chart libraries render into `children` and read colours from
 * `var(--chart-N)` / `var(--success)` / `var(--danger)`.
 */
export function ChartContainer({
  title,
  description,
  actions,
  legend,
  bodyClassName,
  className,
  children,
  ...props
}: ChartContainerProps) {
  return (
    <Card data-slot="chart-container" className={className} {...props}>
      <div className={chartContainerStyles.header}>
        <div className={chartContainerStyles.titles}>
          <h3 className={chartContainerStyles.title}>{title}</h3>
          {description ? <p className={chartContainerStyles.description}>{description}</p> : null}
        </div>
        {actions ? <div className={chartContainerStyles.actions}>{actions}</div> : null}
      </div>
      <div className={cn(chartContainerStyles.body, bodyClassName)}>{children}</div>
      {legend?.length ? (
        <ul className={chartContainerStyles.legend}>
          {legend.map((item) => (
            <li key={item.id} className={chartContainerStyles.legendItem}>
              <span className={chartSwatchVariants({ color: item.color })} aria-hidden="true" />
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
