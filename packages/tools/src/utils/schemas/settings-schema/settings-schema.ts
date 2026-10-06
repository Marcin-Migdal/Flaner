import * as z from "zod";

export const getSettingsSchema = () =>
  z.object({
    startupWaste: z.number().min(0).max(100),
  });

export type SettingsFormData = z.infer<ReturnType<typeof getSettingsSchema>>;

export default getSettingsSchema;
