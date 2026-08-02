import { z } from "zod";

export const createGroupSchema = z.object({
  name: z.string().min(3, "form.errors.minLength").max(50, "form.errors.maxLength"),
  description: z.string().max(255, "form.errors.maxLength").optional(),
  type: z.enum(["public", "private"]),
  requiresApproval: z.boolean(),
  avatarUrl: z.union([z.custom<File>((val) => val instanceof File, "Must be a file"), z.string()]).optional(),
});

export type CreateGroupSchema = z.infer<typeof createGroupSchema>;
