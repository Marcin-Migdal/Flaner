import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createMockUser, createTestI18n, renderWithProviders } from "@flaner/test-utils";
import en from "../../../../../public/locales/en/planning.json";
import * as budgetApi from "../../../../api/budget";
import type { LockedBudget, UnlockedBudget } from "../../../../api/budget";
import { BudgetProvider, useBudgetSession } from "../../../../context/BudgetContext";
import * as budgetDevice from "../../../../utils/budgetDevice";
import { BudgetSecuritySection } from "./BudgetSecuritySection";

vi.mock("../../../../api/budget", () => ({
  getLockedBudget: vi.fn(),
  unlockWithPassphrase: vi.fn(),
  unlockWithRecoveryKey: vi.fn(),
  changeBudgetPassphrase: vi.fn(),
  replaceRecoveryKey: vi.fn(),
  resetBudget: vi.fn(),
}));
vi.mock("../../../../utils/budgetDevice", () => ({ forgetBudget: vi.fn().mockResolvedValue(undefined) }));

const i18n = createTestI18n({ en: { planning: en } });

const locked: LockedBudget = {
  uid: "user-1",
  keyId: "key-1",
  salt: new Uint8Array(16),
  iterations: 600000,
  passphraseWrappedKey: new Uint8Array(60),
  recoveryWrappedKey: new Uint8Array(60),
};

let unlocked: UnlockedBudget;
beforeAll(async () => {
  const userKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  unlocked = { uid: "user-1", keyId: "key-1", userKey };
});

const SessionState = () => {
  const { budget, setBudget } = useBudgetSession();
  return (
    <>
      <button onClick={() => setBudget(unlocked)}>test-unlock</button>
      <p data-testid="session">{budget ? "unlocked" : "locked"}</p>
    </>
  );
};

const renderSection = async () => {
  vi.mocked(budgetApi.getLockedBudget).mockResolvedValue(locked);
  renderWithProviders(
    <BudgetProvider>
      <SessionState />
      <BudgetSecuritySection />
    </BudgetProvider>,
    { i18nInstance: i18n, user: createMockUser({ uid: "user-1" }) },
  );
  const events = userEvent.setup();
  await events.click(screen.getByRole("button", { name: "test-unlock" }));
  return events;
};

describe("BudgetSecuritySection", () => {
  it("Lock budget forgets this device and locks the session", async () => {
    const events = await renderSection();

    await events.click(screen.getByRole("button", { name: "Lock budget" }));

    await waitFor(() => expect(screen.getByTestId("session")).toHaveTextContent("locked"));
    expect(budgetDevice.forgetBudget).toHaveBeenCalledWith("user-1");
  });

  it("changes the passphrase with the recovery key", async () => {
    vi.mocked(budgetApi.unlockWithRecoveryKey).mockResolvedValueOnce(unlocked);
    vi.mocked(budgetApi.changeBudgetPassphrase).mockResolvedValueOnce();
    const events = await renderSection();

    await events.click(screen.getByRole("button", { name: "Change passphrase" }));
    await events.click(await screen.findByRole("button", { name: "Forgot it? Use the recovery key" }));
    await events.type(screen.getByLabelText("Recovery key"), "ABCD-EFGH-JKMN-PQRS-TVWX-YZ01-2345-6789");
    await events.type(screen.getByLabelText("New passphrase"), "green kettle hums softly");
    await events.type(screen.getByLabelText("Repeat the new passphrase"), "green kettle hums softly");
    await events.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Change passphrase" }));

    await waitFor(() =>
      expect(budgetApi.changeBudgetPassphrase).toHaveBeenCalledWith(unlocked, "green kettle hums softly"),
    );
    expect(budgetApi.unlockWithRecoveryKey).toHaveBeenCalledWith(locked, "ABCD-EFGH-JKMN-PQRS-TVWX-YZ01-2345-6789");
  });

  it("rejects a wrong current passphrase without changing anything", async () => {
    vi.mocked(budgetApi.unlockWithPassphrase).mockRejectedValueOnce(new Error("planning:errors.budget.wrongPassphrase"));
    const events = await renderSection();

    await events.click(screen.getByRole("button", { name: "Change passphrase" }));
    await events.type(await screen.findByLabelText("Current passphrase"), "wrong passphrase here");
    await events.type(screen.getByLabelText("New passphrase"), "green kettle hums softly");
    await events.type(screen.getByLabelText("Repeat the new passphrase"), "green kettle hums softly");
    await events.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Change passphrase" }));

    expect(await screen.findByText(/Wrong passphrase/)).toBeInTheDocument();
    expect(budgetApi.changeBudgetPassphrase).not.toHaveBeenCalled();
  });

  it("stores a new recovery key only after it is confirmed as saved", async () => {
    vi.mocked(budgetApi.unlockWithPassphrase).mockResolvedValueOnce(unlocked);
    vi.mocked(budgetApi.replaceRecoveryKey).mockResolvedValueOnce();
    const events = await renderSection();

    await events.click(screen.getByRole("button", { name: "New recovery key" }));
    const shownKey = (await screen.findByTestId("budget-recovery-key")).getAttribute("aria-label");
    await events.type(screen.getByLabelText("Budget passphrase"), "purple tractor sings loudly");
    await events.click(screen.getByRole("button", { name: "Replace recovery key" }));
    expect(await screen.findByText("Confirm that you saved the recovery key.")).toBeInTheDocument();
    expect(budgetApi.replaceRecoveryKey).not.toHaveBeenCalled();

    await events.click(screen.getByRole("checkbox", { name: /I have saved my recovery key/ }));
    await events.click(screen.getByRole("button", { name: "Replace recovery key" }));

    await waitFor(() => expect(budgetApi.replaceRecoveryKey).toHaveBeenCalledWith(unlocked, shownKey));
    expect(shownKey).toMatch(/^([0-9A-Z]{4}-){7}[0-9A-Z]{4}$/);
  });
});
