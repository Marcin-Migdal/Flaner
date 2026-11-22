import { act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createMockUser, renderHookWithProviders } from "@flaner/test-utils";
import * as budgetApi from "../../../../api/budget";
import type { CreateBudgetInput, UnlockedBudget } from "../../../../api/budget";
import { budgetKeys } from "../../queryKeys";
import { useCreateBudgetMutation } from "./useCreateBudgetMutation";

vi.mock("../../../../api/budget", () => ({ createBudget: vi.fn() }));

const user = createMockUser({ uid: "user-1" });

const input: CreateBudgetInput = {
  passphrase: "purple tractor sings loudly",
  recoveryKey: "ABCD-EFGH-JKMN-PQRS-TVWX-YZ01-2345-6789",
  mainCurrency: "PLN",
  mainAccount: { name: "Cash", currency: "PLN" },
  categories: { expense: [], income: [] },
};

describe("useCreateBudgetMutation", () => {
  it("creates the budget for the signed-in user and refreshes their stored keys", async () => {
    const userKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt"]);
    const budget: UnlockedBudget = { uid: "user-1", keyId: "key-1", userKey };
    vi.mocked(budgetApi.createBudget).mockResolvedValueOnce(budget);
    const { result, queryClient } = renderHookWithProviders(() => useCreateBudgetMutation(), { user });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    act(() => result.current.mutate(input));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(budgetApi.createBudget).toHaveBeenCalledWith("user-1", input);
    expect(result.current.data).toBe(budget);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: budgetKeys.locked("user-1") });
  });

  it("fails without a signed-in user", async () => {
    const { result } = renderHookWithProviders(() => useCreateBudgetMutation(), { user: null });

    act(() => result.current.mutate(input));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("errors.userNotAuthenticated");
  });
});
