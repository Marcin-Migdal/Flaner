import { useController, type UseControllerProps, type FieldValues, type FieldPath } from "react-hook-form";
import { ImagePicker, ImagePickerProps } from "./ImagePicker";

export type FormImagePickerProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = Omit<ImagePickerProps, "value" | "onChange" | "name" | "defaultValue"> &
  UseControllerProps<TFieldValues, TName>;

export function FormImagePicker<
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
}: FormImagePickerProps<TFieldValues, TName>) {
  const { field, fieldState } = useController({
    name,
    rules,
    shouldUnregister,
    defaultValue,
    control,
    disabled,
  });

  return (
     
    <ImagePicker
      {...props}
      value={field.value}
      onChange={field.onChange}
      error={fieldState.error?.message}
      ref={field.ref}
    />
  );
}

export default FormImagePicker;
