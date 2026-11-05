import { z } from "zod";

type TranslateFn = (key: string) => string;

export const getGroupSchema = (t: TranslateFn) =>
  z.object({
    name: z.string().min(3, t("validation.groupNameMin")).max(50, t("validation.groupNameMax")),
    description: z.string().max(255, t("validation.descriptionMax")).optional(),
    type: z.enum(["public", "private"]),
    requiresApproval: z.boolean(),
    avatarUrl: z.union([z.custom<File>((val) => val instanceof File, t("validation.avatarFile")), z.string()]).optional(),
  });

export type GroupSchema = z.infer<ReturnType<typeof getGroupSchema>>;
