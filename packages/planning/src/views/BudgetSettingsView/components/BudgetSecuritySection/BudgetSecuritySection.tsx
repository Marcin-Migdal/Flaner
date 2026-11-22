import { useAuth } from "@flaner/shared/context";
import { Button, Card } from "@flaner/ui-components";
import { KeyRound, Lock, RotateCcw, ShieldCheck } from "lucide-react";
import { useState, type ReactNode } from "react";
import { ResetBudgetDialog } from "../../../../components/ResetBudgetDialog";
import { useBudgetSession } from "../../../../context/BudgetContext";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { forgetBudget } from "../../../../utils/budgetDevice";
import { ChangePassphraseDialog } from "../ChangePassphraseDialog";
import { NewRecoveryKeyDialog } from "../NewRecoveryKeyDialog";
import { budgetSecuritySectionStyles as styles } from "./BudgetSecuritySection.styles";

type Dialog = "changePassphrase" | "recoveryKey" | "reset";

type RowProps = { icon: ReactNode; title: string; description: string; action: ReactNode };

const Row = ({ icon, title, description, action }: RowProps) => (
  <li className={styles.row}>
    <span className={styles.icon}>{icon}</span>
    <div className={styles.text}>
      <h3 className={styles.rowTitle}>{title}</h3>
      <p className={styles.rowDescription}>{description}</p>
    </div>
    <div className={styles.action}>{action}</div>
  </li>
);

/** Settings → Accounts & security: change passphrase, new recovery key, Lock budget, Reset budget. */
export const BudgetSecuritySection = () => {
  const { t } = usePlanningTranslations();
  const { user } = useAuth();
  const { setBudget } = useBudgetSession();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const dialogProps = (name: Dialog) => ({
    open: dialog === name,
    onOpenChange: (open: boolean) => setDialog(open ? name : null),
  });

  const lock = async () => {
    // Storage blocked: nothing was remembered, so dropping the key from memory is enough
    if (user) await forgetBudget(user.uid).catch(() => undefined);
    setBudget(null);
  };

  return (
    <section className={styles.root} aria-labelledby="budget-security-title">
      <h2 id="budget-security-title" className={styles.title}>
        {t("budget.security.title")}
      </h2>
      <Card padding="none">
        <ul className={styles.list}>
          <Row
            icon={<KeyRound aria-hidden="true" />}
            title={t("budget.security.changePassphrase.title")}
            description={t("budget.security.changePassphrase.description")}
            action={
              <Button variant="outline" onClick={() => setDialog("changePassphrase")}>
                {t("budget.security.changePassphrase.action")}
              </Button>
            }
          />
          <Row
            icon={<ShieldCheck aria-hidden="true" />}
            title={t("budget.security.recoveryKey.title")}
            description={t("budget.security.recoveryKey.description")}
            action={
              <Button variant="outline" onClick={() => setDialog("recoveryKey")}>
                {t("budget.security.recoveryKey.action")}
              </Button>
            }
          />
          <Row
            icon={<Lock aria-hidden="true" />}
            title={t("budget.security.lock.title")}
            description={t("budget.security.lock.description")}
            action={
              <Button variant="outline" onClick={lock}>
                {t("budget.security.lock.action")}
              </Button>
            }
          />
          <Row
            icon={<RotateCcw aria-hidden="true" />}
            title={t("budget.security.reset.title")}
            description={t("budget.security.reset.description")}
            action={
              <Button variant="destructive" onClick={() => setDialog("reset")}>
                {t("budget.security.reset.action")}
              </Button>
            }
          />
        </ul>
      </Card>
      <ChangePassphraseDialog {...dialogProps("changePassphrase")} />
      <NewRecoveryKeyDialog {...dialogProps("recoveryKey")} />
      <ResetBudgetDialog {...dialogProps("reset")} />
    </section>
  );
};
