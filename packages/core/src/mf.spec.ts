import { beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { loadRemote, registerRemotes } from "@module-federation/runtime";
import { lazyMfeRoutes, lazyProvider, loadMfeNavigation } from "./mf";

vi.mock("@module-federation/runtime", () => ({
  registerRemotes: vi.fn(),
  loadRemote: vi.fn(),
}));

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";

describe("module federation utilities (mf.ts)", () => {
  beforeEach(() => {
    vi.mocked(loadRemote).mockReset();
  });

  it("calls registerRemotes on initialization", () => {
    expect(registerRemotes).toHaveBeenCalled();
  });

  describe("lazyProvider", () => {
    it("returns a React lazy component and renders it when module is loaded", async () => {
      const MockComponent = () => React.createElement("div", null, "Loaded Remote Content");
      vi.mocked(loadRemote).mockResolvedValueOnce({
        default: MockComponent,
      });

      const LazyComp = lazyProvider("settings", "App");
      expect(LazyComp).toBeDefined();

      render(
        React.createElement(
          React.Suspense,
          { fallback: React.createElement("div", null, "Loading remote...") },
          React.createElement(LazyComp)
        )
      );

      expect(await screen.findByText("Loaded Remote Content")).toBeInTheDocument();
      expect(loadRemote).toHaveBeenCalledWith("settings/App");
    });

    it("throws error when remote module fails to load", async () => {
      vi.mocked(loadRemote).mockResolvedValueOnce(null);

      const LazyComp = lazyProvider("settings", "NonExistent");
      type LazyInternal = { _payload: { _result: () => Promise<unknown> } };
      const lazyFn = (LazyComp as unknown as LazyInternal)._payload._result;

      await expect(lazyFn()).rejects.toThrow("Failed to load remote module settings/NonExistent");
    });
  });

  describe("lazyMfeRoutes", () => {
    it("loads remote routes and creates wrapper element that renders matched route", async () => {
      vi.mocked(loadRemote).mockResolvedValueOnce({
        routes: [{ path: "test", element: React.createElement("div", null, "MFE Route Element") }],
      });

      const routeLoader = lazyMfeRoutes("community");
      const result = await routeLoader();

      expect(loadRemote).toHaveBeenCalledWith("community/routes");
      expect(result).toHaveProperty("element");
      expect(React.isValidElement(result.element)).toBe(true);

      render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/test"] },
          result.element
        )
      );

      expect(await screen.findByText("MFE Route Element")).toBeInTheDocument();
    });
  });

  describe("loadMfeNavigation", () => {
    it("loads remote navigation items successfully", async () => {
      const mockNav = [{ path: "/planning", labelKey: "nav.planning", icon: "calendar" }];
      vi.mocked(loadRemote).mockResolvedValueOnce({
        navigation: mockNav,
      });

      const nav = await loadMfeNavigation("planning");
      expect(nav).toEqual(mockNav);
      expect(loadRemote).toHaveBeenCalledWith("planning/navigation");
    });

    it("returns empty array and logs warning if remote fails", async () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.mocked(loadRemote).mockRejectedValueOnce(new Error("Network failed"));

      const nav = await loadMfeNavigation("shopping");
      expect(nav).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("handles timeout if remote hangs", async () => {
      vi.useFakeTimers();
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.mocked(loadRemote).mockReturnValueOnce(new Promise(() => {}));

      const navPromise = loadMfeNavigation("tools");
      await vi.advanceTimersByTimeAsync(8500);

      const nav = await navPromise;
      expect(nav).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to load navigation from tools",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
      vi.useRealTimers();
    });

    it("returns empty array when remote resolves to null or has no navigation", async () => {
      vi.mocked(loadRemote).mockResolvedValueOnce(null as never);
      const nav1 = await loadMfeNavigation("tools");
      expect(nav1).toEqual([]);

      vi.mocked(loadRemote).mockResolvedValueOnce({ navigation: undefined } as never);
      const nav2 = await loadMfeNavigation("tools");
      expect(nav2).toEqual([]);
    });

    it("lazyMfeRoutes falls back to empty routes array when remote returns null", async () => {
      vi.mocked(loadRemote).mockResolvedValueOnce(null as never);
      const routeLoader = lazyMfeRoutes("tools");
      const result = await routeLoader();
      expect(result).toHaveProperty("element");
    });
  });
});
