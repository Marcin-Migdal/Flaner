---
name: react-hook-form
description: Guidelines for creating forms using react-hook-form, @hookform/resolvers/zod, and shadcn components. Make sure to use this skill whenever you are implementing new forms, adding validation to any inputs, or when wrapping inputs with FormProvider. Trigger this whenever the user mentions "forms," "inputs," "validation," or "submitting data."
---

# Form Creation Skill (react-hook-form + Zod + shadcn)

This project uses `react-hook-form` along with `@hookform/resolvers/zod` for form state management and validation. Custom form components with the prefix `Form` (e.g. `FormInput`, `FormSelect`) use `useController` under the hood, meaning they **require** a parent `FormProvider` context.

---

## 1. Core Form Architecture

Every form must follow this three-tiered structure:
1. **Schema Factory**: Defined in `src/utils/schemas/` with dynamic translations (see `validation-schemas` skill).
2. **Form Instantiation**: Created via `useForm` inside the page or component.
3. **Form Provider Wrapper**: The form element must be wrapped in `FormProvider` to supply the react-hook-form context to "Form"-prefixed components.

---

## 2. Implementing a Form (Template)

Below is the standard way to set up and render a form:

```tsx
import React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@flaner/ui-components';
import { getExampleSchema, ExampleFormData } from '../../utils/schemas';

// Import our custom Form components (using prefix "Form" which use useController internally)
import { FormInput } from '@/components/FormInput'; 
import { FormSelect } from '@/components/FormSelect';

export function ExampleForm() {
  const { t } = useTranslation();
  
  // 1. Initialize useForm with type safety and the Zod schema factory
  const methods = useForm<ExampleFormData>({
    resolver: zodResolver(getExampleSchema(t)),
    defaultValues: {
      name: '',
      category: '',
    },
  });

  const onSubmit = (data: ExampleFormData) => {
    console.log('Submitted data:', data);
  };

  return (
    // 2. Wrap the HTML <form> in FormProvider so custom components can access context
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
        
        {/* 3. Render Form components (they resolve their register/errors automatically via useController) */}
        <FormInput 
          name="name" 
          label="Item Name" 
          placeholder="Enter item name..." 
        />
        
        <FormSelect 
          name="category" 
          label="Category" 
          options={[
            { value: 'shopping', label: 'Shopping' },
            { value: 'scheduling', label: 'Scheduling' }
          ]} 
        />

        <Button type="submit">
          Save
        </Button>
      </form>
    </FormProvider>
  );
}
```

---

## 3. How "Form" Prefixed Components Work (`useFormField`)

Components prefixed with `Form` are self-registering. They do not need `register` or `errors` props: each one binds itself through the shared `useFormField` helper (`packages/ui-components/src/hooks/useFormField/`), which wraps `useController` and therefore reads the parent `FormProvider` context (or an explicit `control` prop).

```tsx
export function FormSwitch<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>(
  props: FormSwitchProps<TFieldValues, TName>
) {
  const { field, error, rest } = useFormField(props); // controller props split off, error → message
  return <Switch {...rest} {...field} checked={!!field.value} error={error} />;
}
```

- **Numeric fields** (`FormTextField type="number"`, `FormMoneyInput`) store `number | undefined`: an empty field is `undefined`, never `""` or `NaN`. Write the schema as `z.number({ message })` (required) or `z.number().optional()`, never `z.coerce.number()`.
- **Cleared `FormSelect` / `FormIconTextField`** store `""`; validate with `z.string().min(1, ...)`.
- **`disabled`** on a Form wrapper also leaves the field out of the submitted data (react-hook-form behaviour); `FormColorPickerField` is the exception and still submits it.
- To add a new wrapper, follow the `ui-input-components` skill (§2).

---

## 4. Key Rules & Best Practices

- 🚨 **Prioritize Form-prefixed wrappers**: ALWAYS prioritize using ready-to-use Form-prefixed components (like `FormTextField`) inside forms. Avoid manually defining labels, raw inputs, and error components on every form page; instead, rely on the two-tiered input pattern (see `ui-input-components` skill).
- 🚨 **Always wrap with `FormProvider`**: If you get a console error like `useFormContext` or `useController` must be used within `FormProvider`, check if your component is wrapped in `<FormProvider {...methods}>`.
- 🔑 **Keep defaults complete**: Always define all fields in `defaultValues` when calling `useForm`. If a field is blank, initialize it as `''` (an empty string) or `null` to ensure React treats inputs as controlled from the start.
- 🎯 **Type Safety**: Always pass the schema type `useForm<MyFormType>` to ensure autocomplete and type safety throughout the form.

