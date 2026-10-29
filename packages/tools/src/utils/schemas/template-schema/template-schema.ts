import * as z from "zod";

type TranslateFn = (key: string) => string;

export const getTemplateSchema = (t: TranslateFn) =>
  z.object({
    material: z.string().min(1, t("spooler.templates.validation.materialRequired")),
    type: z.string().min(1, t("spooler.templates.validation.typeRequired")),
    colorName: z.string().min(1, t("spooler.templates.validation.colorRequired")),
    colorHex: z
      .string()
      .transform((val) => (val && val.trim() ? (val.trim().startsWith("#") ? val.trim() : `#${val.trim()}`) : "#ffffff")),
    defaultWeight: z.number().positive(),
  });

export type TemplateFormData = z.infer<ReturnType<typeof getTemplateSchema>>;

export default getTemplateSchema;
