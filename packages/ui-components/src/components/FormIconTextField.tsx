
import { useController, type UseControllerProps, type FieldValues, type FieldPath } from "react-hook-form";
import { IconTextField, type IconTextFieldProps } from "./IconTextField";

export type FormIconTextFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = Omit<IconTextFieldProps, "name" | "value" | "defaultValue" | "onChange" | "onBlur"> &
  UseControllerProps<TFieldValues, TName> & {
    onClear?: () => void;
  };

export function FormIconTextField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  rules,
  shouldUnregister,
  defaultValue,
  control,
  disabled,
  onClear,
  ...props
}: FormIconTextFieldProps<TFieldValues, TName>) {
  const { field, fieldState } = useController({
    name,
    rules,
    shouldUnregister,
    defaultValue,
    control,
    disabled,
  });

  const handleClear = () => {
    field.onChange("");
    onClear?.();
  };

  return (
    <IconTextField
      {...props}
      {...field}
      disabled={disabled}
      error={fieldState.error?.message}
      onClear={props.isClearable ? handleClear : undefined}
    />
  );
}

export default FormIconTextField;
