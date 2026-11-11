import { useMemo } from "react";
import type { FieldPath, FieldValues } from "react-hook-form";
import { useFormField, type FormFieldProps } from "../../hooks/useFormField";
import { Select, type CustomSelectProps, type SelectOption } from "../Select";

const isOptionGroup = (item: SelectOption | { options: readonly SelectOption[] }): item is { options: readonly SelectOption[] } =>
  "options" in item && Array.isArray(item.options);

export type FormSelectProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = FormFieldProps<CustomSelectProps, TFieldValues, TName>;

export function FormSelect<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(props: FormSelectProps<TFieldValues, TName>) {
  const { field, error, rest } = useFormField(props);
  const { options, creatable } = rest;

  const selectedOption = useMemo(() => {
    if (options) {
      for (const item of options) {
        if (isOptionGroup(item)) {
          const found = item.options.find((opt) => opt.value === field.value);
          if (found) return found;
        } else if (item.value === field.value) {
          return item;
        }
      }
    }
    if (creatable && field.value) {
      return { label: String(field.value), value: String(field.value) };
    }
    return null;
  }, [options, creatable, field.value]);

  return (
    <Select
      {...rest}
      {...field}
      value={selectedOption}
      onChange={(option) => field.onChange(option ? option.value : "")}
      error={error}
    />
  );
}

export default FormSelect;
