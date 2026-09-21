import React, { useId } from "react";
import { Checkbox as ShadcnCheckbox } from "./ui/checkbox";
import { Field, FieldLabel, FieldDescription, FieldError } from "./ui/field";
import { cn } from "@flaner/shared/utils";

export interface CheckboxProps
  extends Omit<React.ComponentPropsWithoutRef<typeof ShadcnCheckbox>, "id"> {
  id?: string;
  label?: React.ReactNode;
  description?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<
  React.ElementRef<typeof ShadcnCheckbox>,
  CheckboxProps
>(({ label, description, error, id: customId, className, ...props }, ref) => {
  const defaultId = useId();
  const inputId = customId || defaultId;

  return (
    <Field
      data-invalid={!!error}
      orientation="horizontal"
      className={cn(
        "flex flex-row items-center gap-2.5 py-1",
        description && "items-start",
        className,
      )}
    >
      <ShadcnCheckbox
        id={inputId}
        ref={ref}
        className={description ? "mt-0.5" : undefined}
        {...props}
      />
      {(label || description) && (
        <div className="flex flex-col space-y-1 min-w-0 select-none">
          {label && (
            <FieldLabel
              htmlFor={inputId}
              className="cursor-pointer font-medium text-sm text-foreground leading-none"
            >
              {label}
            </FieldLabel>
          )}
          {description && (
            <FieldDescription className="text-muted-foreground text-sm leading-normal">
              {description}
            </FieldDescription>
          )}
        </div>
      )}
      {error && <FieldError className="w-full">{error}</FieldError>}
    </Field>
  );
});

Checkbox.displayName = "Checkbox";
export default Checkbox;
