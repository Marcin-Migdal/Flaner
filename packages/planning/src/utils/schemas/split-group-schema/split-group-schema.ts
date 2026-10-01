import * as z from "zod";

export type SplitGroupFormMode = "create" | "edit";

export const getSplitGroupSchema = (
  t: (key: string, options?: Record<string, unknown>) => string,
  mode: SplitGroupFormMode,
) =>
  z
    .object({
      name: z
        .string()
        .trim()
        .min(1, t("splits.validation.groupNameRequired"))
        .max(60, t("splits.validation.groupNameMax")),
      description: z.string().max(300, t("splits.validation.descriptionMax")),
      defaultCurrency: z.string().min(1, t("splits.validation.currencyRequired")),
      participants: z.array(z.string()),
      simplifyDebts: z.boolean().optional(),
    })
    .superRefine((data, ctx) => {
      if (mode === "create" && data.participants.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: t("splits.validation.participantsMin"),
          path: ["participants"],
        });
      }
    });

export type SplitGroupFormData = z.infer<ReturnType<typeof getSplitGroupSchema>>;
