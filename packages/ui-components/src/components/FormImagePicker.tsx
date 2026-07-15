import { useController, UseControllerProps } from "react-hook-form";
import { ImagePicker, ImagePickerProps } from "./ImagePicker";

export interface FormImagePickerProps
  extends Omit<ImagePickerProps, "value" | "onChange" | "name" | "defaultValue">,
    UseControllerProps {}

export function FormImagePicker({
  name,
  rules,
  shouldUnregister,
  defaultValue,
  control,
  disabled,
  ...props
}: FormImagePickerProps) {
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
