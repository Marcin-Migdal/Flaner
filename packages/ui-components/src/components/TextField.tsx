import React, { useId, useRef, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "./ui/input";
import { Field, FieldLabel, FieldDescription, FieldError } from "./ui/field";
import { cn } from "@flaner/shared/utils";

export type TextFieldProps = Omit<React.ComponentPropsWithoutRef<"input">, "id"> & {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  incrementLabel?: string;
  decrementLabel?: string;
};

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, description, error, id: customId, className, type, incrementLabel, decrementLabel, ...props }, ref) => {
    const defaultId = useId();
    const inputId = customId || defaultId;
    const innerRef = useRef<HTMLInputElement | null>(null);

    const setRef = useCallback(
      (node: HTMLInputElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    const handleStep = (direction: 1 | -1) => {
      const input = innerRef.current;
      if (!input || props.disabled) return;

      const stepVal = props.step === "any" || !props.step ? 1 : Number(props.step);
      const minVal = props.min !== undefined ? Number(props.min) : -Infinity;
      const maxVal = props.max !== undefined ? Number(props.max) : Infinity;

      const currentVal = input.value === "" ? 0 : Number(input.value);
      if (isNaN(currentVal)) return;

      const stepStr = props.step?.toString() || "";
      const stepDecimals = stepStr.includes(".") ? (stepStr.split(".")[1]?.length || 0) : 0;
      let nextVal = currentVal + direction * stepVal;
      nextVal = Math.min(maxVal, Math.max(minVal, nextVal));
      nextVal = Number(nextVal.toFixed(Math.max(stepDecimals, 2)));

      // React tracks value setters internally on controlled inputs and ignores programmatic .value changes.
      // We call the native HTMLInputElement prototype setter to update the DOM node directly,
      // then dispatch synthetic 'input' and 'change' events so React forms (like react-hook-form) pick up the change.
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeInputValueSetter?.call(input, nextVal.toString());

      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };

    const isNumber = type === "number";

    return (
      <Field data-invalid={!!error} className={className}>
        {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}
        <div className="relative w-full">
          <Input
            id={inputId}
            ref={setRef}
            type={type}
            className={cn(isNumber && "pr-8 font-mono")}
            {...props}
          />
          {isNumber && (
            <div className="absolute right-1 top-1 bottom-1 w-6 flex flex-col justify-center items-center border-l border-border/50 pl-0.5 select-none">
              <button
                type="button"
                tabIndex={-1}
                disabled={props.disabled}
                onClick={() => handleStep(1)}
                className="h-1/2 w-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title={incrementLabel ?? "Increment"}
                aria-label={incrementLabel ?? "Increment"}
              >
                <ChevronUp className="size-3" />
              </button>
              <button
                type="button"
                tabIndex={-1}
                disabled={props.disabled}
                onClick={() => handleStep(-1)}
                className="h-1/2 w-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/60 rounded-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title={decrementLabel ?? "Decrement"}
                aria-label={decrementLabel ?? "Decrement"}
              >
                <ChevronDown className="size-3" />
              </button>
            </div>
          )}
        </div>
        {description && <FieldDescription>{description}</FieldDescription>}
        {error && <FieldError>{error}</FieldError>}
      </Field>
    );
  },
);

TextField.displayName = "TextField";
export default TextField;

