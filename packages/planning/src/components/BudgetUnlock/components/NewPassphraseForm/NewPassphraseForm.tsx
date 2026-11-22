import { useAuth } from "@flaner/shared/context";
import { Button } from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import type { UnlockedBudget } from "../../../../api/budget";
import { useChangeBudgetPassphraseMutation } from "../../../../hooks/api/mutation";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { getBudgetNewPassphraseSchema, type BudgetNewPassphraseFormData } from "../../../../utils/schemas";
import { NewPassphraseFields } from "../../../NewPassphraseFields";
import { newPassphraseFormStyles as styles } from "./NewPassphraseForm.styles";

export type NewPassphraseFormProps = {
  /** Unlocked by the recovery key. */
  budget: UnlockedBudget;
  onSaved: () => void;
};

/** After a recovery-key unlock: replaces the forgotten passphrase before the budget opens. */
export const NewPassphraseForm = ({ budget, onSaved }: NewPassphraseFormProps) => {
  const { t } = usePlanningTranslations();
  const { user } = useAuth();
  const { mutateAsync: changePassphrase, isPending } = useChangeBudgetPassphraseMutation();
  const methods = useForm<BudgetNewPassphraseFormData>({
    resolver: zodResolver(getBudgetNewPassphraseSchema(t, { email: user?.email, username: user?.username })),
    defaultValues: { passphrase: "", passphraseConfirm: "" },
  });

  const submit = async ({ passphrase }: BudgetNewPassphraseFormData) => {
    try {
      await changePassphrase({ budget, passphrase });
      onSaved();
    } catch {
      // Handled by the mutation's global error toast
    }
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(submit)} noValidate className={styles.form}>
        <NewPassphraseFields
          label={t("budget.security.changePassphrase.newLabel")}
          confirmLabel={t("budget.security.changePassphrase.confirmLabel")}
        />
        <Button type="submit" variant="brand" className={styles.submit} isBusy={isPending}>
          {t("budget.unlock.newPassphrase.submit")}
        </Button>
      </form>
    </FormProvider>
  );
};
