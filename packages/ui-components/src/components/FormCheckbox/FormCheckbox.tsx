import type { FieldPath, FieldValues } from "react-hook-form";
import { useFormField, type FormFieldProps } from "../../hooks/useFormField";
import { Checkbox, type CheckboxProps } from "../Checkbox";

export type FormCheckboxProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = FormFieldProps<CheckboxProps, TFieldValues, TName, "checked">;

export function FormCheckbox<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(props: FormCheckboxProps<TFieldValues, TName>) {
  const { field, error, rest } = useFormField(props);

  return (
    <Checkbox
      {...rest}
      {...field}
      checked={!!field.value}
      onCheckedChange={(checked) => field.onChange(checked)}
      error={error}
    />
  );
}

export default FormCheckbox;
