import { useController, UseControllerProps } from "react-hook-form";
import { Select, CustomSelectProps } from "./Select";

export type FormSelectProps = Omit<CustomSelectProps, "name" | "value" | "onChange" | "onBlur" | "defaultValue"> &
  Omit<UseControllerProps, "defaultValue"> & {
  defaultValue?: any;
};

export function FormSelect({
  name,
  rules,
  shouldUnregister,
  defaultValue,
  control,
  disabled,
  ...props
}: FormSelectProps) {
  const { field, fieldState } = useController({
    name,
    rules,
    shouldUnregister,
    defaultValue,
    control,
    disabled,
  });

  const selectedOption = (props.options as any)?.find((opt: any) => opt.value === field.value) || null;

  return (
    <Select
      {...props}
      {...field}
      value={selectedOption as any}
      onChange={(option: any) => field.onChange(option?.value)}
      error={fieldState.error?.message}
    />
  );
}

export default FormSelect;
