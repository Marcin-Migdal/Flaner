import { Avatar, AvatarFallback, AvatarImage, FormCheckbox, FormTextField } from "@flaner/ui-components";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { SPLIT_TYPES } from "../../../../../../api/splits";
import type { SplitGroupMember } from "../../../../../../hooks/useSplitGroupMembers";
import { useMoneyFormatter } from "@flaner/shared/hooks";
import { DEFAULT_CURRENCY } from "@flaner/shared/constants";
import { splitEqually, toMinorUnits } from "@flaner/shared/utils";
import { usePlanningTranslations } from "../../../../../../hooks/usePlanningTranslations";
import type { CreateExpenseFormData } from "../../../../../../utils/schemas";
import { splitEditorStyles as styles, splitSummaryVariants, splitTypeButtonVariants } from "./SplitEditor.styles";

export type SplitEditorProps = {
  membersById: Map<string, SplitGroupMember>;
};

export const SplitEditor = ({ membersById }: SplitEditorProps) => {
  const { t } = usePlanningTranslations();
  const { format } = useMoneyFormatter();
  const { control, setValue, formState } = useFormContext<CreateExpenseFormData>();
  const { fields } = useFieldArray({ control, name: "splits" });

  const [amount, currency, splitType, splits] = useWatch({ control, name: ["amount", "currency", "splitType", "splits"] });
  const formatMoney = (value: number) => format(value, currency || DEFAULT_CURRENCY);

  const totalMinor = toMinorUnits(amount ?? 0);
  const includedIds = (splits ?? []).filter((split) => split.included).map((split) => split.userId);
  const equalShares = new Map(splitEqually(totalMinor, includedIds).map((share) => [share.userId, share.amount]));
  const exactTotalMinor = (splits ?? []).reduce((sum, split) => sum + toMinorUnits(split.amount ?? 0), 0);
  const difference = totalMinor - exactTotalMinor;

  const renderSummary = () => {
    if (splitType === "equally") {
      if (includedIds.length === 0 || totalMinor === 0) return null;
      return (
        <span className={splitSummaryVariants({ state: "neutral" })}>
          {t("splits.expenseModal.perPerson", { amount: formatMoney(Math.floor(totalMinor / includedIds.length)) })}
        </span>
      );
    }

    if (difference === 0) {
      return <span className={splitSummaryVariants({ state: "balanced" })}>{t("splits.expenseModal.balanced")}</span>;
    }
    return difference > 0 ? (
      <span className={splitSummaryVariants({ state: "remaining" })}>
        {t("splits.expenseModal.remaining", { amount: formatMoney(difference) })}
      </span>
    ) : (
      <span className={splitSummaryVariants({ state: "exceeded" })}>
        {t("splits.expenseModal.exceeded", { amount: formatMoney(-difference) })}
      </span>
    );
  };

  const splitsError = formState.errors.splits?.message ?? formState.errors.splits?.root?.message;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t("splits.expenseModal.split")}</h3>
      </div>

      <div className={styles.segmented} role="radiogroup">
        {SPLIT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={splitType === type}
            className={splitTypeButtonVariants({ active: splitType === type })}
            onClick={() => setValue("splitType", type, { shouldValidate: formState.isSubmitted })}
          >
            {t(`splits.splitTypes.${type}`)}
          </button>
        ))}
      </div>

      <div className={styles.rows}>
        {fields.map((field, index) => {
          const member = membersById.get(field.userId);
          const name = member?.isCurrentUser ? t("splits.you") : (member?.name ?? t("splits.unknownUser"));
          const share = equalShares.get(field.userId) ?? 0;

          return (
            <div key={field.id} className={styles.row}>
              <Avatar className={styles.rowAvatar}>
                <AvatarImage src={member?.avatarUrl} />
                <AvatarFallback className={styles.rowAvatarFallback}>{name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>

              {splitType === "equally" ? (
                <>
                  <FormCheckbox name={`splits.${index}.included`} label={name} className={styles.rowCheckbox} />
                  <span className={styles.rowShare}>{formatMoney(share)}</span>
                </>
              ) : (
                <>
                  <span className={styles.rowName}>{name}</span>
                  <FormTextField
                    name={`splits.${index}.amount`}
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    placeholder="0.00"
                    className={styles.rowAmountInput}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>{renderSummary()}</div>
      {splitsError && <p className={styles.error}>{splitsError}</p>}
    </div>
  );
};
