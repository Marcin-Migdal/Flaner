import type { FieldPath, FieldValues } from "react-hook-form";
import { useFormField, type FormFieldProps } from "../../hooks/useFormField";
import { TextArea, type TextAreaProps } from "../TextArea";

export type FormTextAreaProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = FormFieldProps<TextAreaProps, TFieldValues, TName>;

export function FormTextArea<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>(props: FormTextAreaProps<TFieldValues, TName>) {
  const { field, error, rest } = useFormField(props);

  return <TextArea {...rest} {...field} error={error} />;
}

export default FormTextArea;
