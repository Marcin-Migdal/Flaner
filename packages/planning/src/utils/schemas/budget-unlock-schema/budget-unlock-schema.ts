import * as z from "zod";

export const getBudgetUnlockSchema = (t: (key: string) => string) =>
  z.object({
    passphrase: z.string().min(1, t("budget.validation.passphraseRequired")),
  });

export type BudgetUnlockFormData = z.infer<ReturnType<typeof getBudgetUnlockSchema>>;
