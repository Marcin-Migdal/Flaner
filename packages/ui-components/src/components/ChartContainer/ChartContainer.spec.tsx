import { render, screen } from "@testing-library/react";
import { ChartContainer } from "./ChartContainer";

describe("ChartContainer", () => {
  it("renders title, description, actions and the chart body", () => {
    render(
      <ChartContainer
        title="Spending"
        description="Last 6 months"
        actions={<button type="button">Export</button>}
        bodyClassName="h-48"
      >
        <svg data-testid="chart" />
      </ChartContainer>,
    );

    expect(screen.getByRole("heading", { name: "Spending" })).toBeInTheDocument();
    expect(screen.getByText("Last 6 months")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    expect(screen.getByTestId("chart").parentElement).toHaveClass("h-48");
  });

  it("renders a legend with chart colour swatches", () => {
    render(
      <ChartContainer
        title="Balance"
        legend={[
          { id: "in", label: "Owed to you", color: "positive" },
          { id: "food", label: "Food", color: 2 },
        ]}
      />,
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].querySelector("span")).toHaveClass("bg-chart-positive");
    expect(items[1].querySelector("span")).toHaveClass("bg-chart-2");
  });

  it("omits the legend when empty", () => {
    render(<ChartContainer title="Empty" legend={[]} />);

    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
