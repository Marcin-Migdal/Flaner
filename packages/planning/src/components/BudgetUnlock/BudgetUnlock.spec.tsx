import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createTestI18n, renderWithProviders } from "@flaner/test-utils";
import en from "../../../public/locales/en/planning.json";
import * as budgetApi from "../../api/budget";
import type { LockedBudget } from "../../api/budget";
import { BudgetUnlock } from "./BudgetUnlock";

vi.mock("../../api/budget", () => ({ unlockWithPassphrase: vi.fn() }));

const i18n = createTestI18n({ en: { planning: en } });

const locked: LockedBudget = {
  uid: "user-1",
  keyId: "key-1",
  salt: new Uint8Array(16),
  iterations: 600000,
  passphraseWrappedKey: new Uint8Array(60),
  recoveryWrappedKey: new Uint8Array(60),
};

describe("BudgetUnlock", () => {
  it("unlocks with the passphrase", async () => {
    const userKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt"]);
    const unlocked = { uid: "user-1", keyId: "key-1", userKey };
    vi.mocked(budgetApi.unlockWithPassphrase).mockResolvedValueOnce(unlocked);
    const onUnlock = vi.fn();
    const events = userEvent.setup();
    renderWithProviders(<BudgetUnlock locked={locked} onUnlock={onUnlock} />, { i18nInstance: i18n });

    await events.type(screen.getByLabelText("Budget passphrase"), "purple tractor sings loudly");
    await events.click(screen.getByRole("button", { name: "Unlock" }));

    await waitFor(() => expect(onUnlock).toHaveBeenCalledWith(unlocked));
    expect(budgetApi.unlockWithPassphrase).toHaveBeenCalledWith(locked, "purple tractor sings loudly");
  });

  it("explains a wrong passphrase and points to the recovery key", async () => {
    vi.mocked(budgetApi.unlockWithPassphrase).mockRejectedValueOnce(
      new Error("planning:errors.budget.wrongPassphrase"),
    );
    const onUnlock = vi.fn();
    const events = userEvent.setup();
    renderWithProviders(<BudgetUnlock locked={locked} onUnlock={onUnlock} />, { i18nInstance: i18n });

    await events.type(screen.getByLabelText("Budget passphrase"), "wrong passphrase here");
    await events.click(screen.getByRole("button", { name: "Unlock" }));

    expect(await screen.findByText(/Wrong passphrase.*recovery key/)).toBeInTheDocument();
    expect(onUnlock).not.toHaveBeenCalled();
  });
});
