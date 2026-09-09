---
name: validation-schemas
description: Guidelines for creating Zod validation schemas with dynamic multi-language (i18n) support. Make sure to use this skill whenever you are adding schemas under src/utils/schemas/, updating form validations, or configuring validation error keys in locale JSON files. Trigger this when the user mentions "zod", "validation", "schema", "form errors", or "i18n errors".
---
# Validation Schemas Skill

Use this skill to create localized validation schemas. In multi-language applications, validation schemas should not contain static hardcoded strings. Instead, they must dynamically resolve localized error messages.

## 1. Schema Location & Ironclad Architecture Rules

🚨 **IRONCLAD RULE: STRICT FOLDER STRUCTURE — NO FLAT `schemas.ts` FILE**
- **NEVER** create a single flat `src/utils/schemas.ts` file.
- All validation schemas MUST be placed inside a dedicated directory: `src/utils/schemas/`.
- **1 Schema = 1 Dedicated File**: Each schema must reside in its own dedicated file using kebab-case: `src/utils/schemas/[domain]-schema.ts` (e.g. `spool-schema.ts`, `template-schema.ts`, `settings-schema.ts`).
- **Mandatory Barrel Export (`index.ts`)**: `src/utils/schemas/index.ts` MUST exist and re-export all schemas and their inferred types:
  ```typescript
  export * from "./spool-schema";
  export * from "./template-schema";
  ```
- Components and modals import schemas cleanly from the folder: `import { getSpoolSchema, type SpoolFormData } from "../../utils/schemas";`.

---

## 2. Localization Wrapper Pattern

Always export schemas as functions that accept a translation function `t` as an argument. This enables reactive language changes and correct localization.
🚨 **RULE 0 (from 02-project-standards.md)**: NO IN-CODE FALLBACKS. Never use logical OR (`|| 'Fallback'`) for missing translation keys. The translation key must exist in locale files.

### Template:
```typescript
import * as z from 'zod';

type TranslateFn = (key: string) => string;

export const getItemSchema = (t: TranslateFn) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    quantity: z.number({ message: t('validation.quantityNumber') })
      .positive(t('validation.quantityPositive')),
  });

export type ItemFormData = z.infer<ReturnType<typeof getItemSchema>>;
export default getItemSchema;
```

### Complex validation / refinements:
If validation requires comparing fields (e.g. current weight cannot exceed initial weight), append a `.refine()` block to the object.

```typescript
export const getSpoolSchema = (t: TranslateFn) =>
  z.object({
    initialWeight: z.number().positive(),
    currentWeight: z.number().positive(),
  })
  .refine((data) => data.currentWeight <= data.initialWeight, {
    message: t('validation.currentWeightMax'),
    path: ['currentWeight'], // Highlights the specific field in forms
  });
```

---

## 3. How to Use in Components (e.g., with React Hook Form)

To use a localized schema with libraries like React Hook Form and Resolver:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { getItemSchema } from '../../utils/schemas';

const MyForm = () => {
  const { t } = useTranslation();
  
  // Re-generate schema whenever translation changes
  const schema = getItemSchema(t);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  // ...
};
```
