import React, { useId } from "react";
import { Input } from "./ui/input";
import { Field, FieldLabel, FieldDescription, FieldError } from "./ui/field";

export interface TextFieldProps extends Omit<React.ComponentPropsWithoutRef<"input">, "id"> {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, description, error, id: customId, className, ...props }, ref) => {
    const defaultId = useId();
    const inputId = customId || defaultId;

    return (
      <Field data-invalid={!!error} className={className}>
        {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
        <Input id={inputId} ref={ref} {...props} />
        {description && <FieldDescription>{description}</FieldDescription>}
        {error && <FieldError>{error}</FieldError>}
      </Field>
    );
  }
);

TextField.displayName = "TextField";
export default TextField;
