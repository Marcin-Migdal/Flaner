import * as z from "zod";
import { parseRecoveryKey } from "../../budgetCrypto";

export const getBudgetUnlockSchema = (t: (key: string) => string) =>
  z.object({
    passphrase: z.string().min(1, t("budget.validation.passphraseRequired")),
    remember: z.boolean(),
  });

export type BudgetUnlockFormData = z.infer<ReturnType<typeof getBudgetUnlockSchema>>;

/** A field holding a recovery key in any formatting `parseRecoveryKey` accepts. */
export const getRecoveryKeyField = (t: (key: string) => string) =>
  z
    .string()
    .min(1, t("budget.validation.recoveryKeyRequired"))
    .refine((value) => parseRecoveryKey(value) !== null, t("budget.validation.recoveryKeyInvalid"));

export const getBudgetRecoveryUnlockSchema = (t: (key: string) => string) =>
  z.object({
    recoveryKey: getRecoveryKeyField(t),
    remember: z.boolean(),
  });

export type BudgetRecoveryUnlockFormData = z.infer<ReturnType<typeof getBudgetRecoveryUnlockSchema>>;
