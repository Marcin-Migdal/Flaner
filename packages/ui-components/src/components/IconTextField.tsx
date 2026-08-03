import { cn } from "@flaner/shared/utils";
import { X } from "lucide-react";
import React, { useId, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";

export interface IconTextFieldProps extends Omit<React.ComponentPropsWithoutRef<"input">, "id" | "type" | "size"> {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  icon: React.ReactNode;
  isClearable?: boolean;
  onClear?: () => void;
  type?: "text" | "email" | "password" | "number" | "url" | "search" | "tel";
  size?: "sm" | "md" | "lg" | "xl";
  alwaysOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export const IconTextField = React.forwardRef<HTMLInputElement, IconTextFieldProps>(
  (
    {
      label,
      description,
      error,
      id: customId,
      className,
      icon,
      isClearable,
      onClear,
      type = "text",
      size = "xl",
      alwaysOpen = false,
      onOpen,
      onClose,
      ...props
    },
    ref,
  ) => {
    const defaultId = useId();
    const inputId = customId || defaultId;
    const [isExpandedState, setIsExpandedState] = useState(false);
    
    const isExpanded = alwaysOpen || isExpandedState;

    const internalInputRef = useRef<HTMLInputElement>(null);

    const setRefs = (node: HTMLInputElement) => {
      internalInputRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    const handleToggleExpand = (e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (props.disabled) return;
      if (alwaysOpen) {
        internalInputRef.current?.focus();
        return;
      }
      if (isExpandedState) {
        setIsExpandedState(false);
        onClose?.();
      } else {
        setIsExpandedState(true);
        onOpen?.();
        setTimeout(() => internalInputRef.current?.focus(), 50);
      }
    };

    const handleClearClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (props.disabled) return;
      onClear?.();
      internalInputRef.current?.focus();
    };

    const containerHeight = {
      sm: "h-7",
      md: "h-8",
      lg: "h-9",
      xl: "h-10",
    }[size];

    const closedWidth = {
      sm: "w-7",
      md: "w-8",
      lg: "w-9",
      xl: "w-10",
    }[size];

    const expandedButtonMaxWidth = {
      sm: "max-w-[2.25rem]",
      md: "max-w-[2.5rem]",
      lg: "max-w-[2.75rem]",
      xl: "max-w-[3rem]",
    }[size];

    return (
      <Field
        data-invalid={!!error}
        className={cn(
          "transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          isExpanded ? (alwaysOpen ? "w-full" : "w-64") : closedWidth,
          className,
        )}
      >
        {label && <FieldLabel htmlFor={inputId}>{label}</FieldLabel>}

        <div
          role={!isExpanded ? "button" : undefined}
          tabIndex={!isExpanded ? 0 : undefined}
          onClick={!isExpanded ? handleToggleExpand : undefined}
          onKeyDown={
            !isExpanded
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleToggleExpand();
                  }
                }
              : undefined
          }
          className={cn(
            "relative flex w-full items-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] rounded-lg border",
            containerHeight,
            isExpanded
              ? "border-input bg-transparent dark:bg-input/30 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50"
              : "border-border bg-card hover:bg-accent cursor-pointer text-foreground hover:text-accent-foreground shadow-sm",
            error && isExpanded
              ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20 dark:border-destructive/50 dark:focus-within:ring-destructive/40"
              : "",
            props.disabled &&
              isExpanded &&
              "pointer-events-none cursor-not-allowed opacity-50 bg-input/50 dark:bg-input/80",
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={isExpanded ? handleToggleExpand : undefined}
            disabled={props.disabled}
            tabIndex={isExpanded ? 0 : -1}
            className={cn(
              "shrink-0 !h-full !p-0 rounded-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center !w-full !border-y-0 !border-l-0",
              expandedButtonMaxWidth,
              !isExpanded
                ? "pointer-events-none bg-transparent text-inherit !border-r-0"
                : "text-muted-foreground hover:text-foreground !border-r border-border/30 dark:border-border/40",
            )}
          >
            {icon}
          </Button>

          <Input
            id={inputId}
            ref={setRefs}
            type={type}
            disabled={props.disabled || !isExpanded}
            tabIndex={!isExpanded ? -1 : 0}
            className={cn(
              "h-full flex-1 min-w-0 border-0 bg-transparent dark:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-100 rounded-none shadow-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
              isExpanded ? "px-2 opacity-100" : "px-0 opacity-0 pointer-events-none",
            )}
            {...props}
          />

          {isExpanded && isClearable && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleClearClick}
              disabled={props.disabled || !isExpanded}
              tabIndex={!isExpanded ? -1 : 0}
              className={cn(
                "shrink-0 mr-2 rounded-full text-muted-foreground hover:text-foreground transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
                !props.value || !isExpanded
                  ? "opacity-0 pointer-events-none w-0 mr-0 scale-50 !border-0 !p-0"
                  : "opacity-100 w-6 scale-100",
              )}
            >
              <X />
            </Button>
          )}
        </div>

        {description && <FieldDescription>{description}</FieldDescription>}
        {error && <FieldError>{error}</FieldError>}
      </Field>
    );
  },
);

IconTextField.displayName = "IconTextField";
export default IconTextField;
