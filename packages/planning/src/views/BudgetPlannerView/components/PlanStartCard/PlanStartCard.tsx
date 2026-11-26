import { useMoneyFormatter } from "@flaner/shared/hooks";
import { Button } from "@flaner/ui-components";
import { Copy, Repeat, SquarePlus } from "lucide-react";
import type { ReactNode } from "react";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import type { PrefillLimit } from "../../../../utils/plannerRecurring";
import { planStartCardStyles as styles } from "./PlanStartCard.styles";

export type PlanStartCardProps = {
  /** This month's label (e.g. "December 2026"). */
  monthLabel: string;
  mainCurrency: string;
  /** The last planned month before this one with the limits recurring adds on top of its copy; `null`: none. */
  copy: { monthLabel: string; prefill: PrefillLimit[] } | null;
  /** The limits recurring adds to an empty plan. */
  emptyPrefill: PrefillLimit[];
  onCopy: () => void;
  onStartEmpty: () => void;
  isBusy?: boolean;
  disabled?: boolean;
};

/**
 * An empty month: Copy from <last planned month> or Start empty, each listing the limits recurring transactions will
 * add. Nothing is planned until the user picks one.
 */
export const PlanStartCard = ({
  monthLabel,
  mainCurrency,
  copy,
  emptyPrefill,
  onCopy,
  onStartEmpty,
  isBusy,
  disabled,
}: PlanStartCardProps) => {
  const { t } = usePlanningTranslations();
  const { format } = useMoneyFormatter();

  const prefillList = (prefill: PrefillLimit[]) =>
    prefill.length === 0 ? (
      <p className={styles.adds}>{t("budget.planner.start.addsNone")}</p>
    ) : (
      <>
        <p className={styles.adds}>{t("budget.planner.start.adds")}</p>
        <ul className={styles.list}>
          {prefill.map(({ categoryId, category, subcategory, amount }) => (
            <li key={categoryId} className={styles.item}>
              <Repeat aria-hidden="true" />
              {t("budget.planner.start.addsItem", {
                name: subcategory
                  ? t("budget.planner.categoryPath", { category: category.name, subcategory: subcategory.name })
                  : category.name,
                amount: format(amount, mainCurrency),
              })}
            </li>
          ))}
        </ul>
      </>
    );

  const choice = (icon: ReactNode, label: string, prefill: PrefillLimit[], onClick: () => void) => (
    <div className={styles.choice}>
      {prefillList(prefill)}
      <Button variant="outline" className={styles.action} disabled={disabled || isBusy} onClick={onClick}>
        {icon}
        {label}
      </Button>
    </div>
  );

  return (
    <section className={styles.root} aria-labelledby="planner-start">
      <div className={styles.header}>
        <h2 id="planner-start" className={styles.title}>
          {t("budget.planner.start.title", { month: monthLabel })}
        </h2>
        <p className={styles.description}>{t("budget.planner.start.description")}</p>
      </div>
      <div className={styles.choices}>
        {copy &&
          choice(
            <Copy aria-hidden="true" />,
            t("budget.planner.start.copy", { month: copy.monthLabel }),
            copy.prefill,
            onCopy,
          )}
        {choice(<SquarePlus aria-hidden="true" />, t("budget.planner.start.empty"), emptyPrefill, onStartEmpty)}
      </div>
    </section>
  );
};
