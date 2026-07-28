import { useController, UseControllerProps } from "react-hook-form";
import { TextField, TextFieldProps } from "./TextField";

export type FormTextFieldProps = Omit<TextFieldProps, "name" | "value" | "defaultValue" | "onChange" | "onBlur"> &
  UseControllerProps;

export function FormTextField({
  name,
  rules,
  shouldUnregister,
  defaultValue,
  control,
  disabled,
  ...props
}: FormTextFieldProps) {
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
