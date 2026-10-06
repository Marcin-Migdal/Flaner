import { z } from "zod";

export const getSettingsSchema = (t: (key: string) => string) => {
  return z.object({
    username: z.string().min(1, t("validation.usernameRequired")).min(3, t("validation.usernameMin")),
    language: z.enum(["en", "pl"]),
    darkMode: z.boolean(),
    avatar: z.union([z.custom<File>((val) => val instanceof File, "Must be a file"), z.string()]).nullable().optional(),
  });
};

export type SettingsFormData = z.infer<ReturnType<typeof getSettingsSchema>>;

export default getSettingsSchema;
