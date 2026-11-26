import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Route, Routes } from "react-router";
import { createMockUser, createTestI18n, renderWithProviders } from "@flaner/test-utils";
import en from "../../../public/locales/en/planning.json";
import * as budgetApi from "../../api/budget";
import type { LockedBudget, UnlockedBudget } from "../../api/budget";
import type { CreateBudgetInput } from "../../api/budget";
import { BudgetProvider, useBudgetSession } from "../../context/BudgetContext";
import { useCreateBudgetMutation } from "../../hooks/api/mutation";
import { budgetKeys } from "../../hooks/api/queryKeys";
import { BudgetGate } from "./BudgetGate";

import * as budgetDevice from "../../utils/budgetDevice";

vi.mock("../../api/budget", () => ({ getLockedBudget: vi.fn(), unlockWithPassphrase: vi.fn(), createBudget: vi.fn() }));
vi.mock("../../utils/budgetDevice", () => ({ getRememberedBudget: vi.fn() }));

beforeEach(() => {
  vi.mocked(budgetDevice.getRememberedBudget).mockResolvedValue(null);
});

const i18n = createTestI18n({ en: { planning: en } });
const alice = createMockUser({ uid: "alice" });
const bob = createMockUser({ uid: "bob" });

const locked: LockedBudget = {
  uid: "alice",
  keyId: "key-1",
  salt: new Uint8Array(16),
  iterations: 600000,
  passphraseWrappedKey: new Uint8Array(60),
  recoveryWrappedKey: new Uint8Array(60),
};

let unlocked: UnlockedBudget;
beforeAll(async () => {
  unlocked = {
    uid: "alice",
    keyId: "key-1",
    userKey: await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt"]),
  };
});

// Stands in for an unlock elsewhere (e.g. onboarding finished in this session)
const UnlockProbe = () => {
  const { setBudget } = useBudgetSession();
  return <button onClick={() => setBudget(unlocked)}>test-unlock</button>;
};

const onboardingInput: CreateBudgetInput = {
  passphrase: "purple tractor sings loudly",
  recoveryKey: "ABCD-EFGH-JKMN-PQRS-TVWX-YZ01-2345-6789",
  mainCurrency: "PLN",
  mainAccount: { name: "Cash", currency: "PLN" },
  categories: { expense: [], income: [] },
};

// Stands in for the last onboarding step: the same mutation, then the budget kept in the session
const OnboardingProbe = () => {
  const { setBudget } = useBudgetSession();
  const { mutateAsync } = useCreateBudgetMutation();
  return <button onClick={async () => setBudget(await mutateAsync(onboardingInput))}>test-onboard</button>;
};

const ui = (
  <BudgetProvider>
    <UnlockProbe />
    <OnboardingProbe />
    <Routes>
      <Route
        path="/planning/budget"
        element={
          <BudgetGate>
            <p>Budget page</p>
          </BudgetGate>
        }
      />
    </Routes>
  </BudgetProvider>
);

const renderGate = () => renderWithProviders(ui, { user: alice, i18nInstance: i18n, initialEntries: ["/planning/budget"] });

describe("BudgetGate", () => {
  it("shows onboarding instead of the page for a user without budget keys", async () => {
    vi.mocked(budgetApi.getLockedBudget).mockResolvedValue(null);
    renderGate();

    expect(await screen.findByRole("heading", { name: "Set up your Budget" })).toBeInTheDocument();
    expect(screen.queryByText("Budget page")).not.toBeInTheDocument();
  });

  it("asks to unlock when the keys exist but this session has none", async () => {
    vi.mocked(budgetApi.getLockedBudget).mockResolvedValue(locked);
    renderGate();

    expect(await screen.findByRole("heading", { name: "Unlock your Budget" })).toBeInTheDocument();
    expect(screen.queryByText("Budget page")).not.toBeInTheDocument();
  });

  it("shows the page once unlocked, and locks again for another user", async () => {
    vi.mocked(budgetApi.getLockedBudget).mockResolvedValue(locked);
    const events = userEvent.setup();
    const { rerender, setUser } = renderGate();

    await events.click(screen.getByRole("button", { name: "test-unlock" }));
    expect(screen.getByText("Budget page")).toBeInTheDocument();

    setUser(bob);
    rerender(ui);
    expect(await screen.findByRole("heading", { name: "Unlock your Budget" })).toBeInTheDocument();
    expect(screen.queryByText("Budget page")).not.toBeInTheDocument();
  });

  it("opens the page without a prompt on a remembered device", async () => {
    vi.mocked(budgetApi.getLockedBudget).mockResolvedValue(locked);
    vi.mocked(budgetDevice.getRememberedBudget).mockResolvedValue(unlocked);
    renderGate();

    expect(await screen.findByText("Budget page")).toBeInTheDocument();
    expect(budgetDevice.getRememberedBudget).toHaveBeenCalledWith(locked);
    expect(screen.queryByRole("heading", { name: "Unlock your Budget" })).not.toBeInTheDocument();
  });

  it("asks to unlock again when the stored key changed (budget reset on another device)", async () => {
    vi.mocked(budgetApi.getLockedBudget).mockResolvedValue({ ...locked, keyId: "key-2" });
    const events = userEvent.setup();
    renderGate();

    await screen.findByRole("heading", { name: "Unlock your Budget" });
    await events.click(screen.getByRole("button", { name: "test-unlock" }));

    expect(await screen.findByRole("heading", { name: "Unlock your Budget" })).toBeInTheDocument();
    expect(screen.queryByText("Budget page")).not.toBeInTheDocument();
  });

  it("shows onboarding once the stored keys are gone (budget reset on another device, not set up again)", async () => {
    vi.mocked(budgetApi.getLockedBudget).mockResolvedValue(locked);
    const events = userEvent.setup();
    const { queryClient } = renderGate();

    await screen.findByRole("heading", { name: "Unlock your Budget" });
    await events.click(screen.getByRole("button", { name: "test-unlock" }));
    expect(screen.getByText("Budget page")).toBeInTheDocument();

    vi.mocked(budgetApi.getLockedBudget).mockResolvedValue(null);
    await queryClient.refetchQueries({ queryKey: budgetKeys.locked("alice") });

    expect(await screen.findByRole("heading", { name: "Set up your Budget" })).toBeInTheDocument();
    expect(screen.queryByText("Budget page")).not.toBeInTheDocument();
  });

  it("opens the page right after onboarding in this tab, without an unlock prompt", async () => {
    // The fetch before onboarding found no keys; nothing refetches them afterwards
    vi.mocked(budgetApi.getLockedBudget).mockResolvedValue(null);
    vi.mocked(budgetApi.createBudget).mockResolvedValue({ ...unlocked, locked });
    const events = userEvent.setup();
    const { queryClient } = renderGate();

    await screen.findByRole("heading", { name: "Set up your Budget" });
    await events.click(screen.getByRole("button", { name: "test-onboard" }));

    expect(await screen.findByText("Budget page")).toBeInTheDocument();
    expect(queryClient.getQueryData(budgetKeys.locked("alice"))).toEqual(locked);
    await waitFor(() => expect(budgetDevice.getRememberedBudget).not.toHaveBeenCalled());
    expect(screen.queryByRole("heading", { name: "Unlock your Budget" })).not.toBeInTheDocument();
  });
});
