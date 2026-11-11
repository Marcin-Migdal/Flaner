import type { FieldPath, FieldValues } from "react-hook-form";
import { toNumberOrUndefined, useFormField, type FormFieldProps } from "../../hooks/useFormField";
import { TextField, type TextFieldProps } from "../TextField";

export type FormTextFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = FormFieldProps<TextFieldProps, TFieldValues, TName>;

export function FormTextField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(props: FormTextFieldProps<TFieldValues, TName>) {
  const { field, error, rest } = useFormField(props);

  return (
    <TextField
      {...rest}
      {...field}
      value={field.value ?? ""}
      onChange={(e) => field.onChange(rest.type === "number" ? toNumberOrUndefined(e.target.value) : e)}
      onStep={(_, nextVal) => field.onChange(nextVal)}
      error={error}
    />
  );
}

export default FormTextField;
