import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
import type { AppRouteObject } from "@flaner/shared/types";
import { PageTiles } from "./PageTiles";

const i18n = createTestI18n({
  en: {
    common: { "nav.summary": "Summary", "nav.planner": "Planner", "nav.budget": "Budget" },
  },
});

const routes: AppRouteObject[] = [
  { index: true },
  { path: "summary", handle: { label: "nav.summary", icon: "chart-pie" } },
  {
    path: "planner",
    handle: { label: "nav.planner" },
    children: [{ path: "nested", handle: { label: "nav.budget", icon: "wallet" } }],
  },
  { path: "hidden", handle: { label: "nav.hidden", icon: "wallet", hideInNav: true } },
  { path: "item/:id", handle: { label: "nav.item", icon: "wallet" } },
];

const renderTiles = (props: Partial<React.ComponentProps<typeof PageTiles>> = {}) => {
  const onSelect = vi.fn();
  renderWithProviders(
    <PageTiles title="Budget" routes={routes} basePath="/planning/budget" onSelect={onSelect} emptyTitle="No views" {...props} />,
    { i18nInstance: i18n },
  );
  return { onSelect };
};

describe("PageTiles", () => {
  it("renders the title and one tile per visible child, without grandchildren", () => {
    renderTiles();

    expect(screen.getByRole("heading", { level: 1, name: "Budget" })).toBeInTheDocument();
    const tiles = screen.getAllByRole("button");
    expect(tiles.map((tile) => tile.textContent)).toEqual(["Summary", "Planner"]);
  });

  it("calls onSelect with the tile's full path", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderTiles();

    await user.click(screen.getByRole("button", { name: "Planner" }));

    expect(onSelect).toHaveBeenCalledWith("/planning/budget/planner");
  });

  it("lifts children of an unlabelled wrapper route", () => {
    renderTiles({ routes: [{ path: "wrap", children: [{ path: "summary", handle: { label: "nav.summary" } }] }] });

    expect(screen.getByRole("button", { name: "Summary" })).toBeInTheDocument();
  });

  it("shows the empty state when no child is a tile", () => {
    renderTiles({ routes: [{ index: true }], emptyDescription: "Nothing configured" });

    expect(screen.getByText("No views")).toBeInTheDocument();
    expect(screen.getByText("Nothing configured")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
