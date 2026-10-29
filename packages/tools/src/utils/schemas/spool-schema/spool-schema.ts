import * as z from "zod";

type TranslateFn = (key: string) => string;

export const getSpoolSchema = (t: TranslateFn) =>
  z
    .object({
      templateId: z.string().min(1, t("spooler.spools.validation.templateRequired")),
      name: z.string().min(1, t("spooler.spools.validation.nameRequired")),
      initialWeight: z
        .number({ message: t("spooler.spools.validation.initialWeightPositive") })
        .positive(t("spooler.spools.validation.initialWeightPositive")),
      currentWeight: z
        .number({ message: t("spooler.spools.validation.currentWeightPositive") })
        .min(0, t("spooler.spools.validation.currentWeightPositive")),
    })
    .refine((data) => data.currentWeight <= data.initialWeight, {
      message: t("spooler.spools.validation.currentWeightMax"),
      path: ["currentWeight"],
    });

export type SpoolFormData = z.infer<ReturnType<typeof getSpoolSchema>>;

export default getSpoolSchema;
