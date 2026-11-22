import * as z from "zod";
import { parseRecoveryKey } from "../../budgetCrypto";
import type { PassphraseIdentity } from "../../passphrasePolicy";
import { getNewPassphraseField } from "../budget-onboarding-schema";

type Translate = (key: string) => string;

const PASSPHRASE_CONFIRM = (t: Translate) => ({
  message: t("budget.validation.passphraseMismatch"),
  path: ["passphraseConfirm"],
});

/** A new passphrase and its repetition (after a recovery-key unlock). */
export const getBudgetNewPassphraseSchema = (t: Translate, identity: PassphraseIdentity) =>
  z
    .object({ passphrase: getNewPassphraseField(t, identity), passphraseConfirm: z.string() })
    .refine((data) => data.passphrase === data.passphraseConfirm, PASSPHRASE_CONFIRM(t));

export type BudgetNewPassphraseFormData = z.infer<ReturnType<typeof getBudgetNewPassphraseSchema>>;

export const BUDGET_SECRET_METHODS = ["passphrase", "recoveryKey"] as const;

/** Change passphrase: proven with the current passphrase or the recovery key (`method`). */
export const getBudgetChangePassphraseSchema = (t: Translate, identity: PassphraseIdentity) =>
  z
    .object({
      method: z.enum(BUDGET_SECRET_METHODS),
      current: z.string(),
      passphrase: getNewPassphraseField(t, identity),
      passphraseConfirm: z.string(),
    })
    .superRefine((data, ctx) => {
      const isRecoveryKey = data.method === "recoveryKey";
      if (!data.current) {
        const key = isRecoveryKey ? "recoveryKeyRequired" : "passphraseRequired";
        ctx.addIssue({ code: "custom", path: ["current"], message: t(`budget.validation.${key}`) });
      } else if (isRecoveryKey && parseRecoveryKey(data.current) === null) {
        ctx.addIssue({ code: "custom", path: ["current"], message: t("budget.validation.recoveryKeyInvalid") });
      }
      if (data.passphrase !== data.passphraseConfirm) ctx.addIssue({ code: "custom", ...PASSPHRASE_CONFIRM(t) });
    });

export type BudgetChangePassphraseFormData = z.infer<ReturnType<typeof getBudgetChangePassphraseSchema>>;

/** New recovery key: the current passphrase, and the new key confirmed as saved before it replaces the old one. */
export const getBudgetNewRecoveryKeySchema = (t: Translate) =>
  z.object({
    passphrase: z.string().min(1, t("budget.validation.passphraseRequired")),
    recoveryKeySaved: z.boolean().refine((saved) => saved, t("budget.validation.recoveryKeySaved")),
  });

export type BudgetNewRecoveryKeyFormData = z.infer<ReturnType<typeof getBudgetNewRecoveryKeySchema>>;

/**
 * Reset budget: the user types the confirmation word of the page's language (RESET / RESETUJ), case-sensitive.
 * Only surrounding spaces are ignored.
 */
export const getBudgetResetSchema = (t: Translate, confirmationWord: string) =>
  z.object({
    confirmation: z
      .string()
      .refine((value) => value.trim() === confirmationWord, t("budget.validation.resetConfirmation")),
  });

export type BudgetResetFormData = z.infer<ReturnType<typeof getBudgetResetSchema>>;
