import React from "react";
import { useController, UseControllerProps } from "react-hook-form";
import { Switch, SwitchProps } from "./Switch";

export interface FormSwitchProps
  extends Omit<SwitchProps, "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "checked">,
    UseControllerProps {}

export function FormSwitch({
  name,
  rules,
  shouldUnregister,
  defaultValue,
  control,
  disabled,
  ...props
}: FormSwitchProps) {
  const { field, fieldState } = useController({
    name,
    rules,
    shouldUnregister,
    defaultValue,
    control,
    disabled,
  });

  return (
    <Switch
      {...props}
      {...field}
      checked={!!field.value}
      error={fieldState.error?.message}
    />
  );
}

export default FormSwitch;
