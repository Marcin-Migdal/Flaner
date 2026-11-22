import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createMockUser, renderWithProviders } from "@flaner/test-utils";
import type { UnlockedBudget } from "../../api/budget";
import { BudgetProvider, useBudgetSession, useUnlockedBudget } from "./BudgetContext";

const alice = createMockUser({ uid: "alice" });

let aliceBudget: UnlockedBudget;

beforeAll(async () => {
  aliceBudget = {
    uid: "alice",
    keyId: "key-1",
    userKey: await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt"]),
  };
});

const SessionProbe = () => {
  const { budget, setBudget } = useBudgetSession();
  return (
    <>
      <output>{budget ? `unlocked:${budget.uid}` : "locked"}</output>
      <button onClick={() => setBudget(aliceBudget)}>unlock</button>
    </>
  );
};

const ui = (
  <BudgetProvider>
    <SessionProbe />
  </BudgetProvider>
);

describe("BudgetProvider", () => {
  it("starts locked and keeps the unlocked budget", async () => {
    const user = userEvent.setup();
    renderWithProviders(ui, { user: alice });
    expect(screen.getByRole("status")).toHaveTextContent("locked");

    await user.click(screen.getByRole("button", { name: "unlock" }));

    expect(screen.getByRole("status")).toHaveTextContent("unlocked:alice");
  });

  it("useUnlockedBudget fails while the budget is locked", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const Page = () => <>{useUnlockedBudget().uid}</>;

    expect(() =>
      renderWithProviders(
        <BudgetProvider>
          <Page />
        </BudgetProvider>,
        { user: alice },
      ),
    ).toThrow(/Budget gate/);
  });
});
