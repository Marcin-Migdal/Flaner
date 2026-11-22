import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { UnlockedBudget } from "../../api/budget";

type BudgetContextValue = {
  /** The unlocked budget, `null` while locked. Held in memory only. The Budget gate checks it belongs to the signed-in user. */
  budget: UnlockedBudget | null;
  setBudget: (budget: UnlockedBudget | null) => void;
};

const BudgetContext = createContext<BudgetContextValue | null>(null);

/** Keeps the unlocked budget for as long as the planning app is mounted (across Budget pages). */
export const BudgetProvider = ({ children }: { children: ReactNode }) => {
  const [budget, setBudget] = useState<UnlockedBudget | null>(null);
  const value = useMemo(() => ({ budget, setBudget }), [budget]);

  return <BudgetContext.Provider value={value}>{children}</BudgetContext.Provider>;
};

export const useBudgetSession = (): BudgetContextValue => {
  const context = useContext(BudgetContext);
  if (!context) throw new Error("useBudgetSession must be used inside BudgetProvider");
  return context;
};

/** The unlocked budget for a page behind the Budget gate. */
export const useUnlockedBudget = (): UnlockedBudget => {
  const { budget } = useBudgetSession();
  if (!budget) throw new Error("useUnlockedBudget must be used behind the Budget gate");
  return budget;
};
