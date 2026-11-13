---
name: ui-input-components
description: Guidelines for creating new custom UI inputs (like Checkbox, TextArea, Select, DatePicker) and their Form-prefixed wrappers. Make sure to use this skill whenever you are implementing a new type of input or form field in the ui-components package. Trigger this when the user mentions "new input", "custom checkbox", "datepicker", "form wrappers", or "ui-components input".
---

# UI Input Components Creation Pattern

When creating a new input component (e.g., `Checkbox`, `TextArea`, `DatePicker`, `Select`), **ALWAYS ask the user first** about the following two things:

1. **Shadcn UI Usage:** Check if a corresponding `shadcn/ui` component exists for this input type. If it does, ask the user if they want to use the `shadcn` component as a base, or if you should build the component entirely from scratch. (Whenever possible, we prefer using `shadcn`).
2. **Wrapper Generation:** Ask whether they want to create just the Base Component (1 file) or both the Base Component and its `react-hook-form` Form Wrapper (2 files). 

Do NOT automatically create the Form Wrapper unless the user confirms they need it.

If the user wants both files (the two-tiered pattern), follow the instructions below. This ensures clean separation between the visual UI component and its integration with form state.

---

## The Two-Tiered Input Pattern (If requested)

Every input type must have these files in `packages/ui-components/src/components/`:

1. **Base Component (e.g. `MyInput.tsx`)**
   - A pure, stateless presentation component.
   - Wraps lower-level primitives like `<Field>`, `<FieldLabel>`, `<FieldError>`, etc.
   - Receives standard HTML input attributes, `label`, `description`, and `error`.
   - Uses `React.forwardRef` to pass the ref to the underlying native element.
   - Binds labels and inputs using React's `useId` hook.

2. **Form Wrapper (e.g. `FormMyInput.tsx`)**
   - A form-aware wrapper connected to `react-hook-form`.
   - Binds the field through the shared `useFormField` helper (`src/hooks/useFormField/`) — never call `useController` directly in a wrapper.
   - Props: `FormFieldProps<BaseProps, TFieldValues, TName, ExtraOmit?>` = the base props minus the bound ones (`name`, `value`, `defaultValue`, `onChange`, `onBlur`) plus `UseControllerProps`.
   - Holds only what is specific to the input (e.g. `checked={!!field.value}`, option lookup); the binding and the error mapping live in the helper.

---

## 1. Creating the Base Component

### Template:
```tsx
import React, { useId } from "react";
import { Field, FieldLabel, FieldDescription, FieldError } from "./field";
import { cn } from "@flaner/shared/utils";

export interface MyInputProps extends Omit<React.ComponentPropsWithoutRef<"input">, "id"> {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
}

export const MyInput = React.forwardRef<HTMLInputElement, MyInputProps>(
  ({ label, description, error, id: customId, className, ...props }, ref) => {
    const defaultId = useId();
    const inputId = customId || defaultId;

    return (
      <Field data-invalid={!!error} className={className}>
        {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
        
        {/* Render your native or custom input element here */}
        <input
          id={inputId}
          ref={ref}
          className={cn("your-input-styles-here", className)}
          {...props}
        />
        
        {description && <FieldDescription>{description}</FieldDescription>}
        {error && <FieldError>{error}</FieldError>}
      </Field>
    );
  }
);

MyInput.displayName = "MyInput";
export default MyInput;
```

---

## 2. Creating the Form Wrapper Component

`useFormField(props)` splits off the controller props (`name`, `rules`, `shouldUnregister`, `defaultValue`, `control`, `disabled`, `exact`), calls `useController` and returns:
- `field` — spread onto the input (`value`, `onChange`, `onBlur`, `name`, `ref`, `disabled`)
- `error` — `fieldState.error?.message`
- `rest` — every other prop, for the base input

### Template:
```tsx
import type { FieldPath, FieldValues } from "react-hook-form";
import { useFormField, type FormFieldProps } from "../../hooks/useFormField";
import { MyInput, type MyInputProps } from "../MyInput";

export type FormMyInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = FormFieldProps<MyInputProps, TFieldValues, TName>;

export function FormMyInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(props: FormMyInputProps<TFieldValues, TName>) {
  const { field, error, rest } = useFormField(props);

  return <MyInput {...rest} {...field} error={error} />;
}

export default FormMyInput;
```

### Value conversion
- **Numbers:** a numeric input stores `toNumberOrUndefined(e.target.value)` (from the same helper): an empty field is `undefined` (so zod's "required" message shows), anything else a `number`. Used by `FormTextField` (`type="number"`) and `FormMoneyInput`. Never re-implement it in a wrapper.
- **Cleared text / select:** writes `""` (`FormSelect`, `FormIconTextField`), which the `z.string().min(1)` schemas rely on.
- **`disabled`:** passing it to the helper hands it to react-hook-form, which also **drops the field from the submit data**. If a disabled field must still be submitted, keep `disabled` out of the helper and pass it to the input only (see `FormColorPickerField`).

### Tests
The binding, the error mapping and the number conversion are tested once in `useFormField.spec.tsx`. A wrapper spec keeps one smoke test plus tests for its own logic only.

---

## 3. Best Practices

- 📦 **Always export both components** from `packages/ui-components/src/index.ts` so consuming applications can import them cleanly.
- ⚡ **Prop Separation**: The Form wrapper should always omit controlled props (`value`, `onChange`, `onBlur`, `name`) from the extended base props interface. This prevents accidental manual control of form fields.
- 🔍 **Accessibility**: Always use `useId` in the base component to automatically link labels and inputs via `htmlFor` and `id`.

---

## 4. Dark Mode & Light Mode Theming Best Practices

When styling base input components, **never** hardcode colors that only work in one mode (such as `bg-zinc-950` or `border-zinc-800`). All inputs must support dynamic theme switching out of the box:

- 🎨 **Use Semantic Classes**: Rely on theme variables like `bg-background`, `bg-popover`, `border-input`, `border-border`, `text-foreground`, and `text-muted-foreground` so colors adapt automatically.
- 🌓 **State Transitions**: For states like focus or hover, use variables such as `border-ring` and `bg-accent/text-accent-foreground` rather than hardcoded zinc values.
- 🎛️ **Custom Elements (e.g. Switch)**: For custom control tracks, use lighter unchecked background states for light mode and darker ones for dark mode (e.g. `bg-zinc-200 dark:bg-zinc-800`). Keep interactive knobs/thumbs clean and consistent (e.g. `bg-white`).

---

## 5. Asynchronous File / Image Pickers Best Practices

For complex input components that handle binary files (like `ImagePicker`):

- 🔄 **Asynchronous Constraints Validation**: Run validations in the base component before calling `onChange`. For image resolution limits (`minResolution`, `maxResolution`), load the file asynchronously inside a promise using `FileReader` and a native HTML `Image` instance to read `naturalWidth` and `naturalHeight`.
- 📊 **Local & External Errors**: Merge local validation errors (e.g., file size limit exceeded) with external context errors (e.g. react-hook-form schema errors) into a single display error to render under `<FieldError>`.
- 🧼 **Memory Management**: Always release created temporary local URL strings (via `URL.createObjectURL(file)`) during cleanup phases (e.g. inside `useEffect` return statements) to prevent browser memory leaks.
- 📦 **Attachment Layout**: Use modular attachment cards (`Attachment`, `AttachmentMedia`, `AttachmentContent`) to render file previews, names, and sizes, with a clear action button (e.g. Trash icon) to remove the selected file.
- 📬 **Interactive Dropzone**: Implement drag and drop handlers (`onDragOver`, `onDragLeave`, `onDrop`) with visual state cues (e.g. dashed borders transforming into brand colors and expanding scales) alongside standard click-to-select native file input triggers.


