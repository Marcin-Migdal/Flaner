import { onlineManager } from "@tanstack/react-query";
import { toast } from "@flaner/shared/utils";
import { FirebaseError } from "firebase/app";
import { useCallback } from "react";
import { usePlanningTranslations } from "../usePlanningTranslations";

// Firestore reports a lost connection as `unavailable` ("the client is offline")
const isConnectionError = (error: Error) =>
  !onlineManager.isOnline() || (error instanceof FirebaseError && error.code === "unavailable");

const BUDGET_ERROR = /^planning:errors\.budget\./;

/**
 * The error toast of a failed budget write (its mutation sets `skipErrorToast`): "No connection" with Retry when
 * the connection is gone, otherwise the budget error (e.g. the month size guard) or `fallbackKey`.
 */
export const useBudgetWriteErrorToast = () => {
  const { t } = usePlanningTranslations();

  return useCallback(
    (error: Error, { retry, fallbackKey }: { retry: () => void; fallbackKey: string }) => {
      if (isConnectionError(error)) {
        toast.failure(t("budget.offline.noConnection"), { action: { label: t("budget.offline.retry"), onClick: retry } });
        return;
      }
      toast.failure(BUDGET_ERROR.test(error.message) ? t(error.message) : t(fallbackKey));
    },
    [t],
  );
};
