import { useController, type UseControllerProps, type FieldValues, type FieldPath, type PathValue } from "react-hook-form";
import { ColorPickerField, type ColorPickerFieldProps } from "./ColorPickerField";

export type FormColorPickerFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = Omit<ColorPickerFieldProps, "name" | "value" | "defaultValue" | "onChange" | "onBlur"> &
  UseControllerProps<TFieldValues, TName> & {
    onChange?: (value: string) => void;
    onColorSelect?: (value: string) => void;
    onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  };

export function FormColorPickerField<
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
}: FormColorPickerFieldProps<TFieldValues, TName>) {
  const { field, fieldState } = useController({
    name,
    rules,
    shouldUnregister,
    defaultValue,
    control,
  });

  return (
    <ColorPickerField
      {...props}
      {...field}
      disabled={disabled}
      value={field.value ?? ""}
      onChange={(val) => {
        field.onChange(val as PathValue<TFieldValues, TName>);
        props.onChange?.(val);
      }}
      onColorSelect={(val) => {
        props.onColorSelect?.(val);
      }}
      onBlur={(e) => {
        field.onBlur();
        props.onBlur?.(e);
      }}
      error={fieldState.error?.message}
    />
  );
}

export default FormColorPickerField;
