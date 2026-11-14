import * as z from "zod";

type TranslateFn = (key: string) => string;

export const getSettingsSchema = (t: TranslateFn) =>
  z.object({
    startupWaste: z
      .number({ message: t("spooler.settings.startupWasteRange") })
      .min(0, t("spooler.settings.startupWasteRange"))
      .max(100, t("spooler.settings.startupWasteRange")),
  });

export type SettingsFormData = z.infer<ReturnType<typeof getSettingsSchema>>;

export default getSettingsSchema;
