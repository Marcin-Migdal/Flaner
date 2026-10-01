import * as z from "zod";

type TranslateFn = (key: string) => string;

export const getQuickUsageSchema = (t: TranslateFn) =>
  z.object({
    modelWeight: z
      .number({ message: t("spooler.spools.validation.usagePositive") })
      .positive(t("spooler.spools.validation.usagePositive")),
  });

export type QuickUsageFormData = z.infer<ReturnType<typeof getQuickUsageSchema>>;

export default getQuickUsageSchema;
