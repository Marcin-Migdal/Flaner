import * as z from "zod";
import { checkPassphrase, type PassphraseIdentity, type PassphraseProblem } from "../../passphrasePolicy";

const PASSPHRASE_MESSAGES: Record<PassphraseProblem, string> = {
  tooShort: "budget.validation.passphraseTooShort",
  common: "budget.validation.passphraseCommon",
  containsIdentity: "budget.validation.passphraseContainsIdentity",
};

/** A new budget passphrase: the policy's first problem is the field's error. Also used by change passphrase. */
export const getNewPassphraseField = (t: (key: string) => string, identity: PassphraseIdentity) =>
  z.string().superRefine((passphrase, ctx) => {
    const problem = checkPassphrase(passphrase, identity);
    if (problem) ctx.addIssue({ code: "custom", message: t(PASSPHRASE_MESSAGES[problem]) });
  });

/** Fields validated by each onboarding step, in order. */
export const BUDGET_ONBOARDING_STEP_FIELDS = [
  ["passphrase", "passphraseConfirm"],
  ["recoveryKeySaved"],
  ["mainCurrency"],
  ["accountName", "accountCurrency"],
] as const;

export const getBudgetOnboardingSchema = (
  t: (key: string) => string,
  identity: PassphraseIdentity,
) =>
  z
    .object({
      passphrase: getNewPassphraseField(t, identity),
      passphraseConfirm: z.string(),
      recoveryKeySaved: z.boolean().refine((saved) => saved, t("budget.validation.recoveryKeySaved")),
      mainCurrency: z.string().min(1, t("budget.validation.currencyRequired")),
      accountName: z
        .string()
        .trim()
        .min(1, t("budget.validation.accountNameRequired"))
        .max(60, t("budget.validation.accountNameMax")),
      accountCurrency: z.string().min(1, t("budget.validation.currencyRequired")),
    })
    .refine((data) => data.passphrase === data.passphraseConfirm, {
      message: t("budget.validation.passphraseMismatch"),
      path: ["passphraseConfirm"],
    });

export type BudgetOnboardingFormData = z.infer<ReturnType<typeof getBudgetOnboardingSchema>>;
