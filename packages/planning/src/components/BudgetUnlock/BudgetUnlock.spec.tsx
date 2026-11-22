import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createMockUser, createTestI18n, renderWithProviders } from "@flaner/test-utils";
import en from "../../../public/locales/en/planning.json";
import * as budgetApi from "../../api/budget";
import type { LockedBudget, UnlockedBudget } from "../../api/budget";
import { BudgetProvider } from "../../context/BudgetContext";
import * as budgetDevice from "../../utils/budgetDevice";
import { BudgetUnlock } from "./BudgetUnlock";

vi.mock("../../api/budget", () => ({
  unlockWithPassphrase: vi.fn(),
  unlockWithRecoveryKey: vi.fn(),
  changeBudgetPassphrase: vi.fn(),
}));
vi.mock("../../utils/budgetDevice", () => ({
  rememberBudget: vi.fn().mockResolvedValue(undefined),
  forgetBudget: vi.fn().mockResolvedValue(undefined),
}));

const i18n = createTestI18n({ en: { planning: en } });
const RECOVERY_KEY = "ABCD-EFGH-JKMN-PQRS-TVWX-YZ01-2345-6789";

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

const renderUnlock = () => {
  const onUnlock = vi.fn();
  renderWithProviders(
    <BudgetProvider>
      <BudgetUnlock locked={locked} onUnlock={onUnlock} />
    </BudgetProvider>,
    { i18nInstance: i18n, user: createMockUser({ uid: "user-1" }) },
  );
  return { onUnlock, events: userEvent.setup() };
};

describe("BudgetUnlock", () => {
  it("unlocks with the passphrase and remembers this device by default", async () => {
    vi.mocked(budgetApi.unlockWithPassphrase).mockResolvedValueOnce(unlocked);
    const { onUnlock, events } = renderUnlock();

    expect(screen.getByRole("checkbox", { name: /Remember this device/ })).toBeChecked();
    await events.type(screen.getByLabelText("Budget passphrase"), "purple tractor sings loudly");
    await events.click(screen.getByRole("button", { name: "Unlock" }));

    await waitFor(() => expect(onUnlock).toHaveBeenCalledWith(unlocked));
    expect(budgetApi.unlockWithPassphrase).toHaveBeenCalledWith(locked, "purple tractor sings loudly");
    expect(budgetDevice.rememberBudget).toHaveBeenCalledWith(unlocked);
  });

  it("does not remember the device when the user opts out", async () => {
    vi.mocked(budgetApi.unlockWithPassphrase).mockResolvedValueOnce(unlocked);
    const { onUnlock, events } = renderUnlock();

    await events.type(screen.getByLabelText("Budget passphrase"), "purple tractor sings loudly");
    await events.click(screen.getByRole("checkbox", { name: /Remember this device/ }));
    await events.click(screen.getByRole("button", { name: "Unlock" }));

    await waitFor(() => expect(onUnlock).toHaveBeenCalledWith(unlocked));
    expect(budgetDevice.rememberBudget).not.toHaveBeenCalled();
  });

  it("explains a wrong passphrase and points to the recovery key", async () => {
    vi.mocked(budgetApi.unlockWithPassphrase).mockRejectedValueOnce(new Error("planning:errors.budget.wrongPassphrase"));
    const { onUnlock, events } = renderUnlock();

    await events.type(screen.getByLabelText("Budget passphrase"), "wrong passphrase here");
    await events.click(screen.getByRole("button", { name: "Unlock" }));

    expect(await screen.findByText(/Wrong passphrase.*recovery key/)).toBeInTheDocument();
    expect(onUnlock).not.toHaveBeenCalled();
  });

  it("unlocks with the recovery key, then asks for a new passphrase before opening", async () => {
    vi.mocked(budgetApi.unlockWithRecoveryKey).mockResolvedValueOnce(unlocked);
    vi.mocked(budgetApi.changeBudgetPassphrase).mockResolvedValueOnce();
    const { onUnlock, events } = renderUnlock();

    await events.click(screen.getByRole("button", { name: /Use your recovery key/ }));
    await events.type(screen.getByLabelText("Recovery key"), "abcdefghjkmnpqrstvwxyz0123456789");
    await events.click(screen.getByRole("button", { name: "Unlock" }));

    expect(await screen.findByRole("heading", { name: "Choose a new passphrase" })).toBeInTheDocument();
    expect(budgetApi.unlockWithRecoveryKey).toHaveBeenCalledWith(locked, "abcdefghjkmnpqrstvwxyz0123456789");
    expect(onUnlock).not.toHaveBeenCalled();

    await events.type(screen.getByLabelText("New passphrase"), "green kettle hums softly");
    await events.type(screen.getByLabelText("Repeat the new passphrase"), "green kettle hums softly");
    await events.click(screen.getByRole("button", { name: "Save and open the budget" }));

    await waitFor(() => expect(onUnlock).toHaveBeenCalledWith(unlocked));
    expect(budgetApi.changeBudgetPassphrase).toHaveBeenCalledWith(unlocked, "green kettle hums softly");
    expect(budgetDevice.rememberBudget).toHaveBeenCalledWith(unlocked);
  });

  it("explains a recovery key that does not unlock and offers Reset budget", async () => {
    vi.mocked(budgetApi.unlockWithRecoveryKey).mockRejectedValueOnce(new Error("planning:errors.budget.wrongRecoveryKey"));
    const { onUnlock, events } = renderUnlock();

    await events.click(screen.getByRole("button", { name: /Use your recovery key/ }));
    await events.type(screen.getByLabelText("Recovery key"), RECOVERY_KEY);
    await events.click(screen.getByRole("button", { name: "Unlock" }));

    expect(await screen.findByText("This recovery key doesn't unlock your budget.")).toBeInTheDocument();
    expect(onUnlock).not.toHaveBeenCalled();

    await events.click(screen.getByRole("button", { name: "Reset budget" }));
    expect(await screen.findByRole("dialog", { name: "Reset the budget?" })).toBeInTheDocument();
  });
});
