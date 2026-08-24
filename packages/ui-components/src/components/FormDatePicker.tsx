import { useController, UseControllerProps, FieldValues, FieldPath } from "react-hook-form";
import { DatePicker, DatePickerProps } from "./DatePicker";

export type FormDatePickerProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = Omit<DatePickerProps, "name" | "value" | "defaultValue" | "onChange" | "onBlur"> &
  UseControllerProps<TFieldValues, TName>;

export function FormDatePicker<
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
}: FormDatePickerProps<TFieldValues, TName>) {
  const { field, fieldState } = useController({
    name,
    rules,
    shouldUnregister,
    defaultValue,
    control,
    disabled,
  });

  return (
    <DatePicker
      {...props}
      {...field}
      error={fieldState.error?.message}
    />
  );
}

export default FormDatePicker;
