import { useController, type UseControllerProps, type FieldValues, type FieldPath } from "react-hook-form";
import { TextField, TextFieldProps } from "./TextField";

export type FormTextFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = Omit<TextFieldProps, "name" | "value" | "defaultValue" | "onChange" | "onBlur"> &
  UseControllerProps<TFieldValues, TName>;

export function FormTextField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  rules,
  shouldUnregister,
  defaultValue,
  control,
  disabled,
  ...props
}: FormTextFieldProps<TFieldValues, TName>) {
  const { field, fieldState } = useController({
    name,
    rules,
    shouldUnregister,
    defaultValue,
    control,
    disabled,
  });

  return (
    <TextField
      {...props}
      {...field}
      error={fieldState.error?.message}
    />
  );
}

export default FormTextField;
