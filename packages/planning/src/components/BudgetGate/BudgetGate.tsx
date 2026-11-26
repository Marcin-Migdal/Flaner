import { useAuth } from "@flaner/shared/context";
import { EmptyState, LoadingFallback } from "@flaner/ui-components";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useResolvedPath } from "react-router";
import { useGetLockedBudgetQuery } from "../../hooks/api/query";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { useBudgetSession } from "../../context/BudgetContext";
import { getRememberedBudget } from "../../utils/budgetDevice";
import { BudgetOnboarding } from "../BudgetOnboarding";
import { BudgetUnlock } from "../BudgetUnlock";

export type BudgetGateProps = { children: ReactNode };

/**
 * Wraps every Budget page: shows onboarding (no keys yet) or the unlock screen instead of the page until the
 * budget is unlocked. A remembered device unlocks without a prompt. The app shell around it stays visible.
 */
export const BudgetGate = ({ children }: BudgetGateProps) => {
  const { t } = usePlanningTranslations();
  const { user } = useAuth();
  const { budget, setBudget } = useBudgetSession();
  const { data: locked, isPending, isError } = useGetLockedBudgetQuery();
  const navigate = useNavigate();
  // The Budget route's own URL
  const { pathname } = useResolvedPath(".");

  // Never keep the keys of a user who signed out or switched accounts, nor a key replaced or deleted by a reset
  // elsewhere. A cached `null` is always fetched (onboarding writes its keys into the cache), so it means "no keys";
  // while the keys are still loading (`undefined`) the budget is kept.
  const isOwnBudget =
    budget !== null &&
    budget.uid === user?.uid &&
    locked !== null &&
    (locked === undefined || locked.keyId === budget.keyId);
  useEffect(() => {
    if (budget && !isOwnBudget) setBudget(null);
  }, [budget, isOwnBudget, setBudget]);

  // Which stored keys (uid + keyId) this device was already checked for a remembered key
  const [checkedDevice, setCheckedDevice] = useState<string | null>(null);
  const lockedId = locked ? `${locked.uid}:${locked.keyId}` : null;
  useEffect(() => {
    if (!locked || budget) return;
    let cancelled = false;
    getRememberedBudget(locked).then((remembered) => {
      if (cancelled) return;
      if (remembered) setBudget(remembered);
      setCheckedDevice(lockedId);
    });
    return () => {
      cancelled = true;
    };
  }, [locked, lockedId, budget, setBudget]);

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

  if (checkedDevice !== lockedId) return <LoadingFallback />;
  return <BudgetUnlock locked={locked} onUnlock={setBudget} />;
};

export default BudgetGate;
