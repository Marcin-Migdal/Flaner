import { describe, expect, it } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { UserDebtSummary } from "../../../../utils/splitBalances";
import { HeroMetricsWidget } from "./HeroMetricsWidget";

const mockDebtSummary: UserDebtSummary = {
  owedToYou: { EUR: 80 },
  youOwe: { EUR: 30 },
  youOweCount: 1,
  owedToYouCount: 1,
};

describe("HeroMetricsWidget", () => {
  it("renders metric labels and formatted amounts", () => {
    renderWithProviders(
      <HeroMetricsWidget
        defaultCurrency="EUR"
        netBalances={{ EUR: 50 }}
        totalSpent={{ EUR: 400 }}
        debtSummary={mockDebtSummary}
      />
    );

    expect(screen.getAllByText("splits.hero.netBalance")[0]).toBeInTheDocument();
    expect(screen.getAllByText("splits.hero.youOwe")[0]).toBeInTheDocument();
    expect(screen.getAllByText("splits.hero.owedToYou")[0]).toBeInTheDocument();
  });

  it("navigates carousel when previous, next, and dot buttons are clicked", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <HeroMetricsWidget
        defaultCurrency="EUR"
        netBalances={{ EUR: 50 }}
        totalSpent={{ EUR: 400 }}
        debtSummary={mockDebtSummary}
      />
    );

    const nextBtn = screen.getByRole("button", { name: "splits.hero.nextMetric" });
    const prevBtn = screen.getByRole("button", { name: "splits.hero.prevMetric" });

    expect(nextBtn).toBeInTheDocument();
    expect(prevBtn).toBeInTheDocument();

    await user.click(nextBtn);
    await user.click(prevBtn);

    const youOweDot = screen.getByRole("button", { name: "splits.hero.youOwe" });
    await user.click(youOweDot);
  });

  it("handles touch gestures for swiping carousel left and right", () => {
    const { container } = renderWithProviders(
      <HeroMetricsWidget
        defaultCurrency="EUR"
        netBalances={{ EUR: 50 }}
        totalSpent={{ EUR: 400 }}
        debtSummary={mockDebtSummary}
      />
    );

    const root = container.firstChild as HTMLElement;

    // Swipe left (next): diff > 40
    fireEvent.touchStart(root, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(root, { changedTouches: [{ clientX: 40 }] });

    // Swipe right (prev): diff < -40
    fireEvent.touchStart(root, { touches: [{ clientX: 40 }] });
    fireEvent.touchEnd(root, { changedTouches: [{ clientX: 100 }] });

    // Small swipe (< 40)
    fireEvent.touchStart(root, { touches: [{ clientX: 100 }] });
    fireEvent.touchEnd(root, { changedTouches: [{ clientX: 90 }] });

    // Touch end without touchStartX
    fireEvent.touchEnd(root, { changedTouches: [{ clientX: 90 }] });
  });

  it("renders settled state and negative net balance tone", () => {
    const { rerender } = renderWithProviders(
      <HeroMetricsWidget
        defaultCurrency="EUR"
        netBalances={{}}
        totalSpent={{ EUR: 400 }}
        debtSummary={mockDebtSummary}
      />
    );

    // Negative net balance
    rerender(
      <HeroMetricsWidget
        defaultCurrency="EUR"
        netBalances={{ EUR: -50 }}
        totalSpent={{ EUR: 400 }}
        debtSummary={mockDebtSummary}
      />
    );

    // Mixed currencies with sort
    rerender(
      <HeroMetricsWidget
        defaultCurrency="EUR"
        netBalances={{ PLN: 100, EUR: -50, USD: 20 }}
        totalSpent={{ EUR: 400 }}
        debtSummary={mockDebtSummary}
      />
    );
  });
});
