import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createMockUser, createTestI18n, renderWithProviders } from "@flaner/test-utils";
import en from "../../../public/locales/en/planning.json";
import * as budgetApi from "../../api/budget";
import { parseRecoveryKey } from "../../utils/budgetCrypto";
import { BudgetOnboarding } from "./BudgetOnboarding";

vi.mock("../../api/budget", () => ({ createBudget: vi.fn() }));

const i18n = createTestI18n({ en: { planning: en } });
const user = createMockUser({ uid: "user-1", email: "anna@example.com", username: "AnnaK" });
const PASSPHRASE = "purple tractor sings loudly";

const renderOnboarding = (onComplete = vi.fn()) => {
  renderWithProviders(<BudgetOnboarding onComplete={onComplete} />, { user, i18nInstance: i18n });
  return { onComplete, events: userEvent.setup() };
};

const next = () => screen.getByRole("button", { name: "Continue" });

const passPassphraseStep = async (events: ReturnType<typeof userEvent.setup>) => {
  await events.type(screen.getByLabelText("Budget passphrase"), PASSPHRASE);
  await events.type(screen.getByLabelText("Repeat the passphrase"), PASSPHRASE);
  await events.click(next());
};

describe("BudgetOnboarding", () => {
  it("explains the passphrase and rejects weak or personal ones", async () => {
    const { events } = renderOnboarding();

    expect(screen.getByText(/not your Flaner password/)).toBeInTheDocument();
    await events.type(screen.getByLabelText("Budget passphrase"), "password1234");
    await events.click(next());
    expect(await screen.findByText(/too common/)).toBeInTheDocument();

    await events.clear(screen.getByLabelText("Budget passphrase"));
    await events.type(screen.getByLabelText("Budget passphrase"), "annak loves budgets");
    await events.click(next());
    expect(await screen.findByText(/email or username/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Choose a budget passphrase" })).toBeInTheDocument();
  });

  it("shows the strength of the typed passphrase", async () => {
    const { events } = renderOnboarding();

    expect(screen.getByRole("meter", { name: "Too short" })).toBeInTheDocument();
    await events.type(screen.getByLabelText("Budget passphrase"), "Purple tractor sings 4 loudly!");

    expect(screen.getByRole("meter", { name: "Very strong" })).toBeInTheDocument();
  });

  it("shows the recovery key in groups of four and needs it confirmed as saved", async () => {
    const { events } = renderOnboarding();
    await passPassphraseStep(events);

    const key = screen.getByTestId("budget-recovery-key");
    expect(key.getAttribute("aria-label")).toMatch(/^([0-9A-Z]{4}-){7}[0-9A-Z]{4}$/);
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download .txt" })).toBeInTheDocument();

    await events.click(next());
    expect(await screen.findByText("Confirm that you saved the recovery key.")).toBeInTheDocument();

    await events.click(screen.getByRole("checkbox", { name: "I have saved my recovery key" }));
    await events.click(next());
    expect(screen.getByRole("heading", { name: "Choose your main currency" })).toBeInTheDocument();
  });

  it("creates the budget with the main currency from the locale, the main account and seeded categories", async () => {
    const userKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt"]);
    const unlocked = { uid: "user-1", keyId: "key-1", userKey };
    const locked: budgetApi.LockedBudget = {
      uid: "user-1",
      keyId: "key-1",
      salt: new Uint8Array(16),
      iterations: 600000,
      passphraseWrappedKey: new Uint8Array(60),
      recoveryWrappedKey: new Uint8Array(60),
    };
    vi.mocked(budgetApi.createBudget).mockResolvedValueOnce({ ...unlocked, locked });
    const { events, onComplete } = renderOnboarding();

    await passPassphraseStep(events);
    const recoveryKey = screen.getByTestId("budget-recovery-key").getAttribute("aria-label");
    await events.click(screen.getByRole("checkbox", { name: "I have saved my recovery key" }));
    await events.click(next());
    await events.click(next()); // main currency: locale default
    await events.click(screen.getByRole("button", { name: "Finish setup" }));
    expect(await screen.findByText("Enter an account name.")).toBeInTheDocument();

    await events.type(screen.getByLabelText("Account name"), "mBank");
    await events.click(screen.getByRole("button", { name: "Finish setup" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(unlocked));
    const [uid, input] = vi.mocked(budgetApi.createBudget).mock.calls[0];
    expect(uid).toBe("user-1");
    expect(input).toMatchObject({
      passphrase: PASSPHRASE,
      mainCurrency: "USD", // jsdom's navigator.language is en-US
      mainAccount: { name: "mBank", currency: "USD" },
    });
    expect(parseRecoveryKey(input.recoveryKey)).toBe(recoveryKey);
    expect(input.categories.expense).toHaveLength(12);
    expect(input.categories.expense[0].name).toBe("Shopping");
    expect(input.categories.income).toHaveLength(10);
  });
});
