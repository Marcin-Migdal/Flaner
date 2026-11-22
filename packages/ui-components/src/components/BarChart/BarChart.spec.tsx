import { render, screen, within } from "@testing-library/react";
import { BarChart, type BarChartGroup, type BarChartSeries } from "./BarChart";

vi.mock("../../hooks/useUiTranslations", () => ({
  useUiTranslations: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

const SERIES: BarChartSeries[] = [
  { id: "income", label: "Income", color: "positive" },
  { id: "expenses", label: "Expenses", color: "negative" },
];
const GROUPS: BarChartGroup[] = [
  { id: "2026-10", label: "Oct", values: { income: 5000, expenses: 4000 } },
  { id: "2026-11", label: "Nov", values: { income: 5200, expenses: 2600 } },
];
const formatValue = (value: number) => `${value} zł`;

describe("BarChart", () => {
  it("draws one bar per group and series, scaled to the largest value", () => {
    render(<BarChart label="Income vs expenses" groups={GROUPS} series={SERIES} formatValue={formatValue} />);

    expect(screen.getByRole("graphics-document", { name: "Income vs expenses" })).toBeInTheDocument();
    expect(screen.getAllByRole("graphics-symbol")).toHaveLength(4);
    expect(screen.getByRole("graphics-symbol", { name: "Nov, Income: 5200 zł" })).toHaveAttribute("height", "100%");
    expect(screen.getByRole("graphics-symbol", { name: "Nov, Expenses: 2600 zł" })).toHaveAttribute("height", "50%");
  });

  it("marks the highlighted group as current", () => {
    render(
      <BarChart label="Income vs expenses" groups={GROUPS} series={SERIES} formatValue={formatValue} highlightedId="2026-11" />,
    );

    expect(screen.getByRole("rowheader", { name: "Nov" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("rowheader", { name: "Oct" })).not.toHaveAttribute("aria-current");
  });

  it("lists every value in a visually hidden data table", () => {
    render(<BarChart label="Income vs expenses" groups={GROUPS} series={SERIES} formatValue={formatValue} />);

    const table = screen.getByRole("table", { name: "Income vs expenses" });
    expect(table).toHaveClass("sr-only");
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "chart.table.item",
      "Income",
      "Expenses",
    ]);
    expect(within(table).getByRole("rowheader", { name: "Oct" }).parentElement).toHaveTextContent("Oct5000 zł4000 zł");
  });
});
