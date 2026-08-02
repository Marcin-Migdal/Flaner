import { useController, type UseControllerProps, type FieldValues, type FieldPath } from "react-hook-form";
import { Switch, SwitchProps } from "./Switch";

export type FormSwitchProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = Omit<SwitchProps, "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "checked"> &
  UseControllerProps<TFieldValues, TName>;

export function FormSwitch<
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
}: FormSwitchProps<TFieldValues, TName>) {
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
