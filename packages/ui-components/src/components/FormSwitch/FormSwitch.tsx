import type { FieldPath, FieldValues } from "react-hook-form";
import { useFormField, type FormFieldProps } from "../../hooks/useFormField";
import { Switch, type SwitchProps } from "../Switch";

export type FormSwitchProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = FormFieldProps<SwitchProps, TFieldValues, TName, "checked">;

export function FormSwitch<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(props: FormSwitchProps<TFieldValues, TName>) {
  const { field, error, rest } = useFormField(props);

  return <Switch {...rest} {...field} checked={!!field.value} error={error} />;
}

export default FormSwitch;
