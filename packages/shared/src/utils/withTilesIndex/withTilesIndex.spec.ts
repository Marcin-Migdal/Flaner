import { describe, expect, it } from "vitest";
import type { AppRouteObject } from "../../types/navigation";
import { type TilesIndexProps, withTilesIndex } from "./withTilesIndex";

const tilesOf = ({ label, routes }: TilesIndexProps) => `${label}:${routes.length}`;

describe("withTilesIndex", () => {
  it("adds a tiles index route to a labelled route with children", () => {
    const routes: AppRouteObject[] = [
      {
        path: "budget",
        handle: { label: "nav.budget" },
        children: [{ path: "summary", handle: { label: "nav.summary" } }],
      },
    ];

    expect(withTilesIndex(routes, tilesOf)).toEqual([
      {
        path: "budget",
        handle: { label: "nav.budget" },
        children: [
          { index: true, element: "nav.budget:1" },
          { path: "summary", handle: { label: "nav.summary" } },
        ],
      },
    ]);
  });

  it("keeps a route's own index route (opt-out)", () => {
    const routes: AppRouteObject[] = [
      {
        path: "budget",
        handle: { label: "nav.budget" },
        children: [{ index: true, element: "own" }, { path: "summary" }],
      },
    ];

    expect(withTilesIndex(routes, tilesOf)).toEqual(routes);
  });

  it("adds tiles at every depth", () => {
    const routes: AppRouteObject[] = [
      {
        path: "",
        handle: { label: "nav.planning" },
        children: [
          {
            path: "budget",
            handle: { label: "nav.budget" },
            children: [{ path: "summary" }],
          },
        ],
      },
    ];

    const [root] = withTilesIndex(routes, tilesOf);

    expect(root.children?.[0]).toEqual({
      index: true,
      element: "nav.planning:1",
    });
    expect(root.children?.[1].children?.[0]).toEqual({
      index: true,
      element: "nav.budget:1",
    });
  });

  it("leaves unlabelled routes (layouts) without tiles", () => {
    const routes: AppRouteObject[] = [{ path: "budget", children: [{ path: "summary" }] }];

    expect(withTilesIndex(routes, tilesOf)).toEqual(routes);
  });
});
