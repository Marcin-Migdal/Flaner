import { Button } from "@flaner/ui-components";
import { CircleCheck } from "lucide-react";
import type { BudgetMonth } from "../../../../api/budget";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import type { ImportResult } from "../../types";
import { importResultStepStyles as styles } from "./ImportResultStep.styles";

export type ImportResultStepProps = {
  result: ImportResult;
  onOpenMonth: (month: BudgetMonth) => void;
  onClose: () => void;
};

/** Import wizard, Result step: what was imported and what was left out. */
export const ImportResultStep = ({ result, onOpenMonth, onClose }: ImportResultStepProps) => {
  const { t } = usePlanningTranslations();
  const { newestMonth } = result;
  const total = result.imported.reduce((sum, { count }) => sum + count, 0);

  const items = [
    ...result.imported.map(({ accountName, count }) => ({
      key: `account-${accountName}`,
      label: t("budget.import.result.importedTo", { account: accountName }),
      value: count,
    })),
    { key: "duplicates", label: t("budget.import.result.duplicates"), value: result.duplicates },
    { key: "pending", label: t("budget.import.result.pending"), value: result.pending },
    { key: "errors", label: t("budget.import.result.errors"), value: result.errors },
    { key: "unconfirmed", label: t("budget.import.result.unconfirmed"), value: result.unconfirmed },
  ];

  return (
    <div className={styles.root}>
      <div className={styles.hero}>
        <CircleCheck aria-hidden="true" className={styles.heroIcon} />
        <p className={styles.heroTitle}>{t("budget.import.result.title", { count: total })}</p>
      </div>

      <ul className={styles.list} aria-label={t("budget.import.result.summary")}>
        {items.map(({ key, label, value }) => (
          <li key={key} className={styles.item}>
            <span>{label}</span>
            <span className={styles.value}>{value}</span>
          </li>
        ))}
      </ul>

      <div className={styles.footer}>
        <Button variant="outline" onClick={onClose}>
          {t("budget.import.result.close")}
        </Button>
        {newestMonth && (
          <Button variant="brand" onClick={() => onOpenMonth(newestMonth)}>
            {t("budget.import.result.openMonth")}
          </Button>
        )}
      </div>
    </div>
  );
};
