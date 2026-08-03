---
name: validation-schemas
description: Guidelines for creating Zod validation schemas with dynamic multi-language (i18n) support. Make sure to use this skill whenever you are adding schemas under src/utils/schemas/, updating form validations, or configuring validation error keys in locale JSON files. Trigger this when the user mentions "zod", "validation", "schema", "form errors", or "i18n errors".
---
# Validation Schemas Skill

Use this skill to create localized validation schemas. In multi-language applications, validation schemas should not contain static hardcoded strings. Instead, they must dynamically resolve localized error messages.

## 1. Schema Location

Keep all schemas organized under `src/utils/schemas/` rather than defining them inside component files.
- Each schema should reside in its own file (e.g. `src/utils/schemas/item-schema.ts`).
- Export all schemas from `src/utils/schemas/index.ts` for clean importing.

---

## 2. Localization Wrapper Pattern

Always export schemas as functions that accept a translation function `t` as an argument. This enables reactive language changes and correct localization.

### Template:
```typescript
import * as z from 'zod';

export const getItemSchema = (t: any) =>
  z.object({
    name: z.string().min(1, t('validation.nameRequired') || 'Name is required'),
    quantity: z.number({ message: t('validation.quantityNumber') || 'Must be a number' })
      .positive(t('validation.quantityPositive') || 'Must be positive'),
  });
```

### Complex validation / refinements:
If validation requires comparing fields (e.g. current weight cannot exceed initial weight), append a `.refine()` block to the object.

```typescript
export const getSpoolSchema = (t: any) =>
  z.object({
    initialWeight: z.number().positive(),
    currentWeight: z.number().positive(),
  })
  .refine((data) => data.currentWeight <= data.initialWeight, {
    message: t('validation.currentWeightMax') || 'Current weight cannot exceed initial weight',
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
