import { z } from "zod";

export const getSettingsSchema = (t: (key: string) => string) => {
  return z.object({
    username: z
      .string()
      .min(1, t("validation.usernameRequired"))
      .min(3, t("validation.usernameMin")),
    language: z.enum(["en", "pl"]),
    darkMode: z.boolean(),
    avatar: z.any().nullable().optional(),
  });
};

export default getSettingsSchema;
