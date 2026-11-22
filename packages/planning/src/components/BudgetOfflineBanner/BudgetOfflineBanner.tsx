import { Alert, AlertDescription, AlertTitle } from "@flaner/ui-components";
import { WifiOff } from "lucide-react";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";

/** Shown on Budget pages while offline: loaded months stay browsable, writes wait for the connection. */
export const BudgetOfflineBanner = () => {
  const { t } = usePlanningTranslations();

  return (
    <Alert>
      <WifiOff aria-hidden="true" />
      <AlertTitle>{t("budget.offline.title")}</AlertTitle>
      <AlertDescription>{t("budget.offline.description")}</AlertDescription>
    </Alert>
  );
};
