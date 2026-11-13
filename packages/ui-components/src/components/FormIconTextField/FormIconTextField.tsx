import type { FieldPath, FieldValues } from "react-hook-form";
import { useFormField, type FormFieldProps } from "../../hooks/useFormField";
import { IconTextField, type IconTextFieldProps } from "../IconTextField";

export type FormIconTextFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = FormFieldProps<IconTextFieldProps, TFieldValues, TName>;

export function FormIconTextField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({ onClear, ...props }: FormIconTextFieldProps<TFieldValues, TName>) {
  const { field, error, rest } = useFormField(props);

  const handleClear = () => {
    field.onChange("");
    onClear?.();
  };

  return <IconTextField {...rest} {...field} error={error} onClear={rest.isClearable ? handleClear : undefined} />;
}

export default FormIconTextField;
