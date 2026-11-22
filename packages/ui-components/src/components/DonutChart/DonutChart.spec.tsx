import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DonutChart, type DonutChartSegment } from "./DonutChart";

vi.mock("../../hooks/useUiTranslations", () => ({
  useUiTranslations: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

const SEGMENTS: DonutChartSegment[] = [
  {
    id: "food",
    label: "Food",
    value: 600,
    color: 1,
    children: [
      { id: "groceries", label: "Groceries", value: 450, color: 1 },
      { id: "restaurants", label: "Restaurants", value: 150, color: 2 },
    ],
  },
  { id: "home", label: "Home", value: 300, color: 2 },
  { id: "others", label: "Others", value: 100, color: "muted" },
];

const formatValue = (value: number) => `${value} zł`;

function setReducedMotion(reduce: boolean) {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: reduce && query === "(prefers-reduced-motion: reduce)",
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function Drillable({ onSegmentSelect }: { onSegmentSelect?: () => void }) {
  const [drilledId, setDrilledId] = useState<string | null>(null);
  return (
    <DonutChart
      label="Spending"
      segments={SEGMENTS}
      formatValue={formatValue}
      drilledId={drilledId}
      onDrillChange={setDrilledId}
      onSegmentSelect={onSegmentSelect}
    />
  );
}

const pathOf = (name: RegExp) => screen.getByLabelText(name).getAttribute("d");

describe("DonutChart", () => {
  beforeEach(() => setReducedMotion(true));

  it("draws every segment with its value and share in its accessible name", () => {
    render(<DonutChart label="Spending" segments={SEGMENTS} formatValue={formatValue} onDrillChange={vi.fn()} />);

    expect(screen.getByRole("graphics-document", { name: "Spending" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Food: 600 zł (60%)" })).toBeInTheDocument();
    expect(screen.getByRole("graphics-symbol", { name: "Others: 100 zł (10%)" })).toHaveAttribute("tabindex", "0");
  });

  it("drills into a segment with Enter or Space", async () => {
    const onDrillChange = vi.fn();
    render(<DonutChart label="Spending" segments={SEGMENTS} formatValue={formatValue} onDrillChange={onDrillChange} />);

    await userEvent.tab();
    expect(screen.getByRole("button", { name: /^Food/ })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");

    expect(onDrillChange).toHaveBeenCalledTimes(2);
    expect(onDrillChange).toHaveBeenCalledWith("food");
  });

  it("shows the drilled segment's children and a visible Back button", async () => {
    const onDrillChange = vi.fn();
    render(
      <DonutChart
        label="Spending"
        segments={SEGMENTS}
        drilledId="food"
        backLabel="All categories"
        formatValue={formatValue}
        onDrillChange={onDrillChange}
      />,
    );

    expect(screen.getByRole("graphics-symbol", { name: "Groceries: 450 zł (75%)" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Home/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "All categories" }));
    expect(onDrillChange).toHaveBeenCalledWith(null);
  });

  it("selects a segment that has no children", async () => {
    const onSegmentSelect = vi.fn();
    render(
      <DonutChart
        label="Spending"
        segments={SEGMENTS}
        drilledId="food"
        formatValue={formatValue}
        onDrillChange={vi.fn()}
        onSegmentSelect={onSegmentSelect}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /^Restaurants/ }));

    expect(onSegmentSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "restaurants" }));
  });

  it("goes back with Escape from a drilled segment", async () => {
    const onDrillChange = vi.fn();
    render(
      <DonutChart
        label="Spending"
        segments={SEGMENTS}
        drilledId="food"
        formatValue={formatValue}
        onDrillChange={onDrillChange}
        onSegmentSelect={vi.fn()}
      />,
    );

    screen.getByRole("button", { name: /^Groceries/ }).focus();
    await userEvent.keyboard("{Escape}");

    expect(onDrillChange).toHaveBeenCalledWith(null);
  });

  it("moves keyboard focus into the first child even when the children are not selectable", async () => {
    render(<Drillable />);

    await userEvent.tab();
    await userEvent.keyboard("{Enter}");

    expect(screen.getByRole("graphics-symbol", { name: /^Groceries/ })).toHaveFocus();
  });

  it("moves keyboard focus into the first child on drill-down and back to the parent on Back", async () => {
    render(<Drillable onSegmentSelect={vi.fn()} />);

    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: /^Groceries/ })).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: /^Food/ })).toHaveFocus();
  });

  it("lists the shown segments in a visually hidden data table", () => {
    render(<DonutChart label="Spending" segments={SEGMENTS} formatValue={formatValue} onDrillChange={vi.fn()} />);

    const table = screen.getByRole("table", { name: "Spending" });
    expect(table).toHaveClass("sr-only");
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(4);
    expect(within(rows[1]).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["600 zł", "60%"]);
  });

  it("jumps straight to the drilled shapes when the user prefers reduced motion", () => {
    const props = { label: "Spending", segments: SEGMENTS, formatValue, onDrillChange: vi.fn() };
    const { unmount } = render(<DonutChart {...props} drilledId="food" />);
    const settled = pathOf(/^Groceries/);
    unmount();

    const view = render(<DonutChart {...props} />);
    view.rerender(<DonutChart {...props} drilledId="food" />);

    expect(pathOf(/^Groceries/)).toBe(settled);
  });

  it("tweens a drill-down and settles on the drilled shapes", async () => {
    setReducedMotion(false);
    const props = { label: "Spending", segments: SEGMENTS, formatValue, onDrillChange: vi.fn(), onSegmentSelect: vi.fn() };
    const { unmount } = render(<DonutChart {...props} drilledId="food" />);
    const settled = pathOf(/^Groceries/);
    unmount();

    const { rerender } = render(<DonutChart {...props} />);
    rerender(<DonutChart {...props} drilledId="food" />);
    expect(pathOf(/^Groceries/)).not.toBe(settled);

    await waitFor(() => expect(pathOf(/^Groceries/)).toBe(settled));
  });
});
