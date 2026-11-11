import type { FieldPath, FieldValues } from "react-hook-form";
import { useFormField, type FormFieldProps } from "../../hooks/useFormField";
import { DatePicker, type DatePickerProps } from "../DatePicker";

export type FormDatePickerProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = FormFieldProps<DatePickerProps, TFieldValues, TName>;

export function FormDatePicker<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(props: FormDatePickerProps<TFieldValues, TName>) {
  const { field, error, rest } = useFormField(props);

  return <DatePicker {...rest} {...field} error={error} />;
}

export default FormDatePicker;
