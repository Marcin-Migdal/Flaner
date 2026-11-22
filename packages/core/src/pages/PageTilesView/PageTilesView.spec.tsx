import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, createTestI18n } from "@flaner/test-utils";
import { loadRemote } from "@module-federation/runtime";
import type { AppRouteObject } from "@flaner/shared/types";
import { PageTilesView } from "./PageTilesView";

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@module-federation/runtime", () => ({
  loadRemote: vi.fn(),
}));

// An MFE exposes its views as children of a root route at `/<mfe>`
const root = (children: AppRouteObject[]): AppRouteObject[] => [
  { path: "", handle: { label: "nav.community", icon: "users" }, children },
];

describe("PageTilesView", () => {
  const i18n = createTestI18n({
    en: {
      common: {
        "nav.community": "Społeczność",
        "nav.friends": "Znajomi",
        "mfe.noViewsTitle": "Brak podstron",
        "mfe.noViewsDesc": "Ten moduł nie ma jeszcze skonfigurowanych podstron.",
      },
    },
  });

  it("renders tiles and navigates when clicking on a tile", async () => {
    const user = userEvent.setup();
    vi.mocked(loadRemote).mockResolvedValueOnce({
      routes: root([
        {
          path: "friends",
          handle: {
            label: "nav.friends",
            icon: "users",
          },
        },
      ]),
    });

    renderWithProviders(<PageTilesView mfe="community" />, { i18nInstance: i18n });

    await waitFor(() => {
      expect(screen.getByText("Społeczność")).toBeInTheDocument();
      expect(screen.getByText("Znajomi")).toBeInTheDocument();
    });

    const tileBtn = screen.getByRole("button", { name: /znajomi/i });
    await user.click(tileBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/community/friends");
  });

  it("renders empty state when MFE returns no tiles", async () => {
    vi.mocked(loadRemote).mockResolvedValueOnce({
      routes: [],
    });

    renderWithProviders(<PageTilesView mfe="planning" />, { i18nInstance: i18n });

    await waitFor(() => {
      expect(screen.getByText("Brak podstron")).toBeInTheDocument();
      expect(screen.getByText("Ten moduł nie ma jeszcze skonfigurowanych podstron.")).toBeInTheDocument();
    });
  });

  it("handles loadRemote failure gracefully and displays empty state", async () => {
    vi.mocked(loadRemote).mockRejectedValueOnce(new Error("Module ./routes does not exist"));

    renderWithProviders(<PageTilesView mfe="shopping" />, { i18nInstance: i18n });

    await waitFor(() => {
      expect(screen.getByText("Brak podstron")).toBeInTheDocument();
    });
  });

  it("handles generic loadRemote failure and reports the error", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(loadRemote).mockRejectedValueOnce(new Error("Failed network connection"));

    renderWithProviders(<PageTilesView mfe="tools" />, { i18nInstance: i18n });

    await waitFor(() => {
      expect(reportError).toHaveBeenCalledWith(new Error("Failed network connection"));
    });

    consoleErrorSpy.mockRestore();
  });

  it("handles nested route children and renders sub-tiles", async () => {
    vi.mocked(loadRemote).mockResolvedValueOnce({
      routes: root([
        {
          path: "parent",
          children: [
            {
              path: "child",
              handle: {
                label: "nav.friends",
                icon: "users",
              },
            },
          ],
        },
      ]),
    });

    renderWithProviders(<PageTilesView mfe="community" />, { i18nInstance: i18n });

    await waitFor(() => {
      expect(screen.getByText("Znajomi")).toBeInTheDocument();
    });
    await userEvent.setup().click(screen.getByRole("button", { name: /znajomi/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/community/parent/child");
  });

  it("shows only the root's own children, not grandchildren", async () => {
    vi.mocked(loadRemote).mockResolvedValueOnce({
      routes: root([
        {
          path: "budget",
          handle: { label: "nav.friends", icon: "wallet" },
          children: [{ path: "summary", handle: { label: "nav.community" } }],
        },
      ]),
    });

    renderWithProviders(<PageTilesView mfe="planning" />, { i18nInstance: i18n });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /znajomi/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /społeczność/i })).not.toBeInTheDocument();
  });

  it("updates routes when mfe prop changes", async () => {
    vi.mocked(loadRemote)
      .mockResolvedValueOnce({
        routes: root([
          {
            path: "friends",
            handle: { label: "nav.friends", icon: "users" },
          },
        ]),
      })
      .mockResolvedValueOnce({
        routes: [],
      });

    const { rerender } = renderWithProviders(<PageTilesView mfe="community" />, { i18nInstance: i18n });

    await waitFor(() => {
      expect(screen.getByText("Znajomi")).toBeInTheDocument();
    });

    // Change mfe prop
    rerender(<PageTilesView mfe="planning" />);

    await waitFor(() => {
      expect(screen.getByText("Brak podstron")).toBeInTheDocument();
    });
  });

  it("handles tile without icon", async () => {
    const user = userEvent.setup();
    vi.mocked(loadRemote).mockResolvedValueOnce({
      routes: root([
        {
          path: "feed",
          handle: { label: "nav.community" },
        },
      ]),
    });

    renderWithProviders(<PageTilesView mfe="community" />, { i18nInstance: i18n });

    await waitFor(() => {
      expect(screen.getByText("Społeczność")).toBeInTheDocument();
    });

    const tileBtn = screen.getByRole("button", { name: /społeczność/i });
    await user.click(tileBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/community/feed");
  });
});
