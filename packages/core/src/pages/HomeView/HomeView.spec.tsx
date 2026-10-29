import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders, createTestI18n } from "@flaner/test-utils";
import { HomeView } from "./HomeView";

describe("HomeView", () => {
  const i18n = createTestI18n({
    en: {
      common: {
        "home.title": "Witaj w Flaner",
        "home.subtitle": "Twój osobisty asystent",
        "nav.shopping": "Zakupy",
        "home.cards.shopping": "Zarządzaj listami zakupów",
        "nav.planning": "Planowanie",
        "home.cards.planning": "Planuj wyjazdy",
        "nav.community": "Społeczność",
        "home.cards.community": "Znajdź znajomych",
        "nav.settings": "Ustawienia",
        "home.cards.settings": "Dostosuj motyw",
        "nav.tools": "Narzędzia",
        "home.cards.tools": "Kalkulatory i Spooler",
      },
    },
  });

  it("renders welcome header and 5 navigation cards with correct links", () => {
    renderWithProviders(<HomeView />, { i18nInstance: i18n });

    expect(screen.getByText("Witaj w Flaner")).toBeInTheDocument();
    expect(screen.getByText("Twój osobisty asystent")).toBeInTheDocument();

    const shoppingLink = screen.getByRole("link", { name: /zakupy/i });
    expect(shoppingLink).toHaveAttribute("href", "/shopping");

    const planningLink = screen.getByRole("link", { name: /planowanie/i });
    expect(planningLink).toHaveAttribute("href", "/planning");

    const communityLink = screen.getByRole("link", { name: /społeczność/i });
    expect(communityLink).toHaveAttribute("href", "/community");

    const settingsLink = screen.getByRole("link", { name: /ustawienia/i });
    expect(settingsLink).toHaveAttribute("href", "/settings");

    const toolsLink = screen.getByRole("link", { name: /narzędzia/i });
    expect(toolsLink).toHaveAttribute("href", "/tools");
  });
});
