import { useController, UseControllerProps } from "react-hook-form";
import { TextArea, TextAreaProps } from "./TextArea";

export type FormTextAreaProps = Omit<TextAreaProps, "name" | "value" | "defaultValue" | "onChange" | "onBlur"> &
  UseControllerProps;

export function FormTextArea({
  name,
  rules,
  shouldUnregister,
  defaultValue,
  control,
  disabled,
  ...props
}: FormTextAreaProps) {
  const { field, fieldState } = useController({
    name,
    rules,
    shouldUnregister,
    defaultValue,
    control,
    disabled,
  });

  return (
    <TextArea
      {...props}
      {...field}
      error={fieldState.error?.message}
    />
  );
}

export default FormTextArea;
