import { useMemo } from "react";
import { useController, type UseControllerProps, type FieldValues, type FieldPath, type PathValue } from "react-hook-form";
import { CustomSelectProps, Select, type SelectOption } from "../Select";

const isOptionGroup = (item: SelectOption | { options: readonly SelectOption[] }): item is { options: readonly SelectOption[] } =>
  "options" in item && Array.isArray(item.options);

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
    if (props.options) {
      for (const item of props.options) {
        if (isOptionGroup(item)) {
          const found = item.options.find((opt) => opt.value === field.value);
          if (found) return found;
        } else if (item.value === field.value) {
          return item;
        }
      }
    }
    if (props.creatable && field.value) {
      return { label: String(field.value), value: String(field.value) };
    }
    return null;
  }, [props.options, props.creatable, field.value]);

  return (
    <Select
      {...props}
      {...field}
      value={selectedOption}
      // shortcut: react-hook-form cannot tie the option value to a generic field path; the field holds the option value by contract
      onChange={(option) => field.onChange((option ? option.value : "") as PathValue<TFieldValues, TName>)}
      error={fieldState.error?.message}
    />
  );
}

export default FormSelect;
