import { Card } from "@flaner/ui-components";
import { useState } from "react";
import type { LockedBudget, UnlockedBudget } from "../../api/budget";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { rememberBudget } from "../../utils/budgetDevice";
import { ResetBudgetDialog } from "../ResetBudgetDialog";
import { budgetUnlockStyles as styles } from "./BudgetUnlock.styles";
import { NewPassphraseForm } from "./components/NewPassphraseForm";
import { PassphraseUnlockForm } from "./components/PassphraseUnlockForm";
import { RecoveryKeyUnlockForm } from "./components/RecoveryKeyUnlockForm";

export type BudgetUnlockProps = {
  locked: LockedBudget;
  onUnlock: (budget: UnlockedBudget) => void;
};

/** A recovery-key unlock always ends with a new passphrase, so the forgotten one is replaced. */
type Stage =
  | { kind: "passphrase" }
  | { kind: "recoveryKey" }
  | { kind: "newPassphrase"; budget: UnlockedBudget; remember: boolean };

const STAGE_TEXT = {
  passphrase: { title: "budget.unlock.title", description: "budget.unlock.description" },
  recoveryKey: { title: "budget.unlock.recovery.title", description: "budget.unlock.recovery.description" },
  newPassphrase: { title: "budget.unlock.newPassphrase.title", description: "budget.unlock.newPassphrase.description" },
};

/** Unlock with the passphrase or the recovery key, optionally remembering this device. */
export const BudgetUnlock = ({ locked, onUnlock }: BudgetUnlockProps) => {
  const { t } = usePlanningTranslations();
  const [stage, setStage] = useState<Stage>({ kind: "passphrase" });
  const [isResetOpen, setResetOpen] = useState(false);

  const finish = async (budget: UnlockedBudget, remember: boolean) => {
    // Storage blocked (private browsing): the budget still opens, it just asks again next time
    if (remember) await rememberBudget(budget).catch(reportError);
    onUnlock(budget);
  };

  return (
    <div className={styles.root}>
      <Card className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>{t(STAGE_TEXT[stage.kind].title)}</h1>
          <p className={styles.description}>{t(STAGE_TEXT[stage.kind].description)}</p>
        </div>

        {stage.kind === "passphrase" && (
          <PassphraseUnlockForm
            locked={locked}
            onUnlock={finish}
            onUseRecoveryKey={() => setStage({ kind: "recoveryKey" })}
          />
        )}
        {stage.kind === "recoveryKey" && (
          <RecoveryKeyUnlockForm
            locked={locked}
            onUnlock={(budget, remember) => setStage({ kind: "newPassphrase", budget, remember })}
            onUsePassphrase={() => setStage({ kind: "passphrase" })}
            onReset={() => setResetOpen(true)}
          />
        )}
        {stage.kind === "newPassphrase" && (
          <NewPassphraseForm budget={stage.budget} onSaved={() => finish(stage.budget, stage.remember)} />
        )}
      </Card>
      <ResetBudgetDialog open={isResetOpen} onOpenChange={setResetOpen} />
    </div>
  );
};
