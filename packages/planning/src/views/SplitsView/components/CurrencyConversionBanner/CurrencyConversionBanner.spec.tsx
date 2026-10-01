import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@flaner/test-utils";
import type { SplitGroup } from "../../../../api/splits";
import { CurrencyConversionBanner } from "./CurrencyConversionBanner";

const convertCurrencyMock = vi.fn().mockImplementation((_params, options?: { onSuccess?: () => void }) => {
  options?.onSuccess?.();
  return Promise.resolve();
});

vi.mock("../../../../hooks/api/mutation", () => ({
  useConvertSplitGroupCurrencyMutation: () => ({
    mutateAsync: convertCurrencyMock,
    isPending: false,
  }),
}));

const mockGroupNoForeign: SplitGroup = {
  id: "grp-1",
  name: "Local Trip",
  description: "",
  defaultCurrency: "EUR",
  lastUsedCurrency: "EUR",
  createdBy: "user-1",
  participants: ["user-1"],
  formerParticipants: [],
  simplifyDebts: false,
  totalSpent: { EUR: 100 },
  balances: { EUR: { "user-1": 0 } },
  pairBalances: {},
  expensesCount: 1,
  settlementsCount: 0,
  status: "active",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

const mockGroupWithForeign: SplitGroup = {
  id: "grp-2",
  name: "Global Trip",
  description: "",
  defaultCurrency: "EUR",
  lastUsedCurrency: "EUR",
  createdBy: "user-1",
  participants: ["user-1"],
  formerParticipants: [],
  simplifyDebts: false,
  totalSpent: { EUR: 100, USD: 50 },
  balances: { EUR: { "user-1": 0 }, USD: { "user-1": 50 } },
  pairBalances: {},
  expensesCount: 2,
  settlementsCount: 0,
  status: "active",
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

describe("CurrencyConversionBanner", () => {
  it("renders null when group has no foreign currencies", () => {
    const { container } = renderWithProviders(<CurrencyConversionBanner group={mockGroupNoForeign} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders banner and opens confirmation modal to convert currency", async () => {
    const user = userEvent.setup();

    renderWithProviders(<CurrencyConversionBanner group={mockGroupWithForeign} />);

    expect(screen.getByText("splits.conversion.bannerTitle")).toBeInTheDocument();

    const actionBtn = screen.getByRole("button", { name: "splits.conversion.action" });
    await user.click(actionBtn);

    expect(screen.getByText("splits.conversion.confirmTitle")).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "splits.conversion.confirm" });
    await user.click(confirmBtn);

    expect(convertCurrencyMock).toHaveBeenCalledWith(
      { groupId: "grp-2", targetCurrency: "EUR" },
      expect.any(Object),
    );
  });
});
