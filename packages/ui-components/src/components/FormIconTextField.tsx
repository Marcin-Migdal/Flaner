
import { useController, UseControllerProps } from "react-hook-form";
import { IconTextField, IconTextFieldProps } from "./IconTextField";

export interface FormIconTextFieldProps
  extends Omit<IconTextFieldProps, "name" | "value" | "defaultValue" | "onChange" | "onBlur">,
    UseControllerProps {
  onClear?: () => void;
}

export function FormIconTextField({
  name,
  rules,
  shouldUnregister,
  defaultValue,
  control,
  disabled,
  onClear,
  ...props
}: FormIconTextFieldProps) {
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
