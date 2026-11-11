import type { FieldPath, FieldValues } from "react-hook-form";
import { useFormField, type FormFieldProps } from "../../hooks/useFormField";
import { ImagePicker, type ImagePickerProps } from "../ImagePicker";

export type FormImagePickerProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = FormFieldProps<ImagePickerProps, TFieldValues, TName, "disabled">;

export function FormImagePicker<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(props: FormImagePickerProps<TFieldValues, TName>) {
  const { field, error, rest } = useFormField(props);

  return (
    <ImagePicker
      {...rest}
      ref={field.ref}
      value={field.value}
      onChange={field.onChange}
      disabled={field.disabled}
      error={error}
    />
  );
}

export default FormImagePicker;
