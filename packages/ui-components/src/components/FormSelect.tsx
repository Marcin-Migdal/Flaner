import { useMemo } from "react";
import { useController, type UseControllerProps, type FieldValues, type FieldPath, type PathValue } from "react-hook-form";
import { CustomSelectProps, Select } from "./Select";

export type FormSelectProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = Omit<CustomSelectProps, "name" | "value" | "onChange" | "onBlur" | "defaultValue"> &
  UseControllerProps<TFieldValues, TName>;

export function FormSelect<
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
}: FormSelectProps<TFieldValues, TName>) {
  const { field, fieldState } = useController({
    name,
    rules,
    shouldUnregister,
    defaultValue,
    control,
    disabled,
  });

  const selectedOption = useMemo(() => {
    if (!props.options) return null;
    for (const item of props.options) {
      if ("options" in item) {
        const found = item.options.find((opt) => opt.value === field.value);
        if (found) return found;
      } else if (item.value === field.value) {
        return item;
      }
    }
    return null;
  }, [props.options, field.value]);

  return (
    <Select
      {...props}
      {...field}
      value={selectedOption}
      onChange={(option) => field.onChange(option?.value as PathValue<TFieldValues, TName>)}
      error={fieldState.error?.message}
    />
  );
}

export default FormSelect;
