import React, { useId } from "react";
import { Field, FieldLabel, FieldDescription, FieldError } from "./ui/field";
import { cn } from "@flaner-v2/shared";

export interface SwitchProps extends Omit<React.ComponentPropsWithoutRef<"input">, "id" | "type"> {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  checked?: boolean;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, description, error, id: customId, className, checked, onChange, onBlur, ...props }, ref) => {
    const defaultId = useId();
    const switchId = customId || defaultId;

    return (
      <Field data-invalid={!!error} className={cn("flex flex-row items-center justify-between gap-4 py-1", className)}>
        <div className="flex flex-col space-y-1">
          {label && <FieldLabel htmlFor={switchId} className="cursor-pointer">{label}</FieldLabel>}
          {description && <FieldDescription className="text-zinc-500 text-xs">{description}</FieldDescription>}
        </div>

        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input
            id={switchId}
            type="checkbox"
            ref={ref}
            checked={checked}
            onChange={onChange}
            onBlur={onBlur}
            className="sr-only peer"
            {...props}
          />
          {/* Switch track and thumb */}
          <div className="w-10 h-6 bg-zinc-200 dark:bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand dark:peer-checked:bg-brand transition-colors" />
        </label>
        {error && <FieldError>{error}</FieldError>}
      </Field>
    );
  }
);

Switch.displayName = "Switch";
export default Switch;
