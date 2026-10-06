import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, createTestI18n } from "@flaner/test-utils";
import { MfeRouteErrorBoundary } from "./MfeRouteErrorBoundary";

const { mockUseRouteError, mockUseLocation } = vi.hoisted(() => ({
  mockUseRouteError: vi.fn(),
  mockUseLocation: vi.fn(),
}));

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useRouteError: () => mockUseRouteError(),
    useLocation: () => mockUseLocation(),
  };
});

describe("MfeRouteErrorBoundary", () => {
  const i18n = createTestI18n({
    en: {
      common: {
        "errorBoundary.title": "Nie udało się załadować modułu {{name}}",
        "errorBoundary.desc": "Spróbuj odświeżyć stronę.",
        "errorBoundary.unknownError": "Nieznany błąd",
      },
    },
  });

  it("renders error boundary with error message and mfe name from path", () => {
    mockUseRouteError.mockReturnValue(new Error("Script load failed"));
    mockUseLocation.mockReturnValue({ pathname: "/community/groups" });

    renderWithProviders(<MfeRouteErrorBoundary />, { i18nInstance: i18n });

    expect(screen.getByText("Nie udało się załadować modułu community")).toBeInTheDocument();
    expect(screen.getByText("Spróbuj odświeżyć stronę.")).toBeInTheDocument();
    expect(screen.getByText("Script load failed")).toBeInTheDocument();
  });

  it("falls back to default mfe name and unknown error message when error is missing", () => {
    mockUseRouteError.mockReturnValue(null);
    mockUseLocation.mockReturnValue({ pathname: "/" });

    renderWithProviders(<MfeRouteErrorBoundary />, { i18nInstance: i18n });

    expect(screen.getByText("Nie udało się załadować modułu mfe")).toBeInTheDocument();
    expect(screen.getByText("Nieznany błąd")).toBeInTheDocument();
  });
});
