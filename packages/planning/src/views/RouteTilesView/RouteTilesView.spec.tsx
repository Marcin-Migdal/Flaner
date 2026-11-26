import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { useLocation, useRoutes } from "react-router";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
import type { AppRouteObject } from "@flaner/shared/types";
import { withTilesIndex } from "@flaner/shared/utils";
import { RouteTilesView } from "./RouteTilesView";

const i18n = createTestI18n({
  en: {
    planning: {
      nav: {
        budget: "Budget",
        budgetSummary: "Summary",
        budgetPlanner: "Planner",
      },
    },
  },
});

const LocationProbe = () => <output>{useLocation().pathname}</output>;

const budgetRoute = (children: AppRouteObject[]): AppRouteObject[] => [
  {
    path: "/planning/budget",
    handle: { label: "planning:nav.budget", icon: "piggy-bank" },
    children,
  },
];

const views: AppRouteObject[] = [
  {
    path: "summary",
    element: <LocationProbe />,
    handle: { label: "planning:nav.budgetSummary", icon: "chart-pie" },
  },
  {
    path: "planner",
    element: <LocationProbe />,
    handle: { label: "planning:nav.budgetPlanner", icon: "list-checks" },
  },
];

const Routes = ({ routes }: { routes: AppRouteObject[] }) =>
  useRoutes(withTilesIndex(routes, (tiles) => <RouteTilesView {...tiles} />));

describe("RouteTilesView", () => {
  it("is the index of a route with children: tiles of its children, opening one", async () => {
    const user = userEvent.setup();
    renderWithProviders(<Routes routes={budgetRoute(views)} />, {
      i18nInstance: i18n,
      initialEntries: ["/planning/budget"],
    });

    expect(
      screen.getByRole("heading", { level: 1, name: "Budget" }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button").map((tile) => tile.textContent),
    ).toEqual(["Summary", "Planner"]);

    await user.click(screen.getByRole("button", { name: "Planner" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "/planning/budget/planner",
    );
  });

  it("is not added when the route declares its own index", () => {
    renderWithProviders(
      <Routes
        routes={budgetRoute([
          { index: true, element: <p>Own index</p> },
          ...views,
        ])}
      />,
      {
        i18nInstance: i18n,
        initialEntries: ["/planning/budget"],
      },
    );

    expect(screen.getByText("Own index")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });
});
