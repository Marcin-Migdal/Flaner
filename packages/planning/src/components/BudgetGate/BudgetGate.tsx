import { useAuth } from "@flaner/shared/context";
import { EmptyState, LoadingFallback } from "@flaner/ui-components";
import { useEffect, type ReactNode } from "react";
import { useNavigate, useResolvedPath } from "react-router";
import { useGetLockedBudgetQuery } from "../../hooks/api/query";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { useBudgetSession } from "../../context/BudgetContext";
import { BudgetOnboarding } from "../BudgetOnboarding";
import { BudgetUnlock } from "../BudgetUnlock";

export type BudgetGateProps = { children: ReactNode };

/**
 * Wraps every Budget page: shows onboarding (no keys yet) or the unlock screen instead of the page until the
 * budget is unlocked. The app shell around it stays visible.
 */
export const BudgetGate = ({ children }: BudgetGateProps) => {
  const { t } = usePlanningTranslations();
  const { user } = useAuth();
  const { budget, setBudget } = useBudgetSession();
  const { data: locked, isPending, isError } = useGetLockedBudgetQuery();
  const navigate = useNavigate();
  // The Budget route's own URL
  const { pathname } = useResolvedPath(".");

  // Never keep the keys of a user who signed out or switched accounts
  const isOwnBudget = budget !== null && budget.uid === user?.uid;
  useEffect(() => {
    if (budget && !isOwnBudget) setBudget(null);
  }, [budget, isOwnBudget, setBudget]);

  if (isOwnBudget) return children;
  if (isPending) return <LoadingFallback />;
  if (isError) return <EmptyState title={t("errors.fetchError", { ns: "common" })} />;

  if (!locked) {
    return (
      <BudgetOnboarding
        onComplete={(unlocked) => {
          setBudget(unlocked);
          navigate(`${pathname}/transactions`);
        }}
      />
    );
  }

  return <BudgetUnlock locked={locked} onUnlock={setBudget} />;
};

export default BudgetGate;
