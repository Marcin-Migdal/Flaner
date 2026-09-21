import { useController, type UseControllerProps, type FieldValues, type FieldPath } from "react-hook-form";
import { Checkbox, CheckboxProps } from "./Checkbox";

export type FormCheckboxProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = Omit<CheckboxProps, "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "checked"> &
  UseControllerProps<TFieldValues, TName>;

export function FormCheckbox<
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
}: FormCheckboxProps<TFieldValues, TName>) {
  const { field, fieldState } = useController({
    name,
    rules,
    shouldUnregister,
    defaultValue,
    control,
    disabled,
  });

  return (
    <Checkbox
      {...props}
      {...field}
      checked={!!field.value}
      onCheckedChange={(checked) => field.onChange(checked)}
      error={fieldState.error?.message}
    />
  );
}

export default FormCheckbox;
