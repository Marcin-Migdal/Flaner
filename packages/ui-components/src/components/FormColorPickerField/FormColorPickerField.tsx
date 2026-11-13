import type { FieldPath, FieldValues } from "react-hook-form";
import { useFormField, type FormFieldProps } from "../../hooks/useFormField";
import { ColorPickerField, type ColorPickerFieldProps } from "../ColorPickerField";

export type FormColorPickerFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = FormFieldProps<ColorPickerFieldProps, TFieldValues, TName> & {
  onChange?: (value: string) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
};

export function FormColorPickerField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({ disabled, onChange, onBlur, ...props }: FormColorPickerFieldProps<TFieldValues, TName>) {
  // `disabled` stays out of react-hook-form on purpose: a disabled field is left out of the submit data,
  // and a disabled colour (a preset in TemplateFormModal) must still be submitted.
  const { field, error, rest } = useFormField(props);

  return (
    <ColorPickerField
      {...rest}
      {...field}
      disabled={disabled}
      value={field.value ?? ""}
      onChange={(val) => {
        field.onChange(val);
        onChange?.(val);
      }}
      onBlur={(e) => {
        field.onBlur();
        onBlur?.(e);
      }}
      error={error}
    />
  );
}

export default FormColorPickerField;
