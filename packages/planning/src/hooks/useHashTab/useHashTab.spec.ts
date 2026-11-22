import { act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useLocation } from "react-router";
import { renderHookWithProviders } from "@flaner/test-utils";
import { useHashTab } from "./useHashTab";

const TABS = ["accounts", "categories", "rules"] as const;

const renderTabs = (entry: string) =>
  renderHookWithProviders(
    () => {
      const [tab, setTab] = useHashTab(TABS);
      return { tab, setTab, location: useLocation() };
    },
    { initialEntries: [entry] },
  );

describe("useHashTab", () => {
  it("opens the first tab without a hash", () => {
    const { result } = renderTabs("/planning/budget/settings");
    expect(result.current.tab).toBe("accounts");
  });

  it("opens the tab named by the hash (so a refresh keeps it)", () => {
    const { result } = renderTabs("/planning/budget/settings#rules");
    expect(result.current.tab).toBe("rules");
  });

  it("opens the first tab for an unknown hash", () => {
    const { result } = renderTabs("/planning/budget/settings#nope");
    expect(result.current.tab).toBe("accounts");
  });

  it("writes the tab to the hash, and clears it for the first tab", () => {
    const { result } = renderTabs("/planning/budget/settings");

    act(() => result.current.setTab("categories"));
    expect(result.current.tab).toBe("categories");
    expect(result.current.location).toMatchObject({ pathname: "/planning/budget/settings", hash: "#categories" });

    act(() => result.current.setTab("accounts"));
    expect(result.current.tab).toBe("accounts");
    expect(result.current.location.hash).toBe("");
  });

  it("ignores an unknown tab", () => {
    const { result } = renderTabs("/planning/budget/settings#rules");

    act(() => result.current.setTab("nope"));
    expect(result.current.tab).toBe("rules");
  });
});
