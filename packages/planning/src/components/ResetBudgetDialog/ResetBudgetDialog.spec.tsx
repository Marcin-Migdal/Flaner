import { screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createMockUser, createTestI18n, renderWithProviders } from "@flaner/test-utils";
import en from "../../../public/locales/en/planning.json";
import * as budgetApi from "../../api/budget";
import type { UnlockedBudget } from "../../api/budget";
import { BudgetProvider, useBudgetSession } from "../../context/BudgetContext";
import * as budgetDevice from "../../utils/budgetDevice";
import { ResetBudgetDialog } from "./ResetBudgetDialog";

vi.mock("../../api/budget", () => ({ resetBudget: vi.fn() }));
vi.mock("../../utils/budgetDevice", () => ({ forgetBudget: vi.fn().mockResolvedValue(undefined) }));

const i18n = createTestI18n({ en: { planning: en } });

// Unlocks the session, then opens the dialog over it
const Harness = ({ budget, onOpenChange }: { budget: UnlockedBudget; onOpenChange: (open: boolean) => void }) => {
  const session = useBudgetSession();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => {
          session.setBudget(budget);
          setOpen(true);
        }}
      >
        test-open
      </button>
      <p data-testid="session">{session.budget ? "unlocked" : "locked"}</p>
      <ResetBudgetDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange(next);
        }}
      />
    </>
  );
};

const renderDialog = async () => {
  const userKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const onOpenChange = vi.fn();
  renderWithProviders(
    <BudgetProvider>
      <Harness budget={{ uid: "user-1", keyId: "key-1", userKey }} onOpenChange={onOpenChange} />
    </BudgetProvider>,
    { i18nInstance: i18n, user: createMockUser({ uid: "user-1" }) },
  );
  const events = userEvent.setup();
  await events.click(screen.getByRole("button", { name: "test-open" }));
  return { onOpenChange, events };
};

describe("ResetBudgetDialog", () => {
  it("does nothing until the confirmation word is typed", async () => {
    const { events } = await renderDialog();

    await events.type(screen.getByLabelText("Type RESET to confirm"), "RESTE");
    await events.click(screen.getByRole("button", { name: "Delete all budget data" }));

    expect(await screen.findByText("Type the word exactly as shown.")).toBeInTheDocument();
    expect(budgetApi.resetBudget).not.toHaveBeenCalled();
  });

  it("deletes the budget, forgets this device and locks the session", async () => {
    vi.mocked(budgetApi.resetBudget).mockResolvedValueOnce();
    const { onOpenChange, events } = await renderDialog();

    await events.type(screen.getByLabelText("Type RESET to confirm"), "reset");
    await events.click(screen.getByRole("button", { name: "Delete all budget data" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(budgetApi.resetBudget).toHaveBeenCalledWith("user-1");
    expect(budgetDevice.forgetBudget).toHaveBeenCalledWith("user-1");
    expect(screen.getByTestId("session")).toHaveTextContent("locked");
  });
});
