import React, { useId } from "react";
import { Field, FieldLabel, FieldDescription, FieldError } from "./ui/field";
import { Textarea as ShadcnTextarea } from "./ui/textarea";

export type TextAreaProps = Omit<React.ComponentPropsWithoutRef<"textarea">, "id"> & {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
};

export const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, description, error, id: customId, className, ...props }, ref) => {
    const defaultId = useId();
    const inputId = customId || defaultId;

    return (
      <Field data-invalid={!!error} className={className}>
        {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
        <ShadcnTextarea id={inputId} ref={ref} {...props} />
        {description && <FieldDescription>{description}</FieldDescription>}
        {error && <FieldError>{error}</FieldError>}
      </Field>
    );
  }
);

TextArea.displayName = "TextArea";
