import React, { useId, useRef } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "./ui/field";
import { cn } from "@flaner/shared/utils";

export type ColorPickerFieldProps = Omit<
  React.ComponentPropsWithoutRef<"input">,
  "id" | "type" | "onChange" | "value"
> & {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onColorSelect?: (value: string) => void;
  presetColors?: string[];
  containerClassName?: string;
  labelClassName?: string;
};

const DEFAULT_PRESETS = [
  "#000000",
  "#ffffff",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#6b7280",
];

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export const ColorPickerField = React.forwardRef<HTMLInputElement, ColorPickerFieldProps>(
  (
    {
      label,
      description,
      error,
      id: customId,
      value = "",
      defaultValue,
      onChange,
      onColorSelect,
      presetColors = DEFAULT_PRESETS,
      containerClassName,
      labelClassName,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const defaultId = useId();
    const inputId = customId || defaultId;
    const colorInputRef = useRef<HTMLInputElement>(null);

    const currentColor = value ?? defaultValue ?? "";
    const swatchColor =
      currentColor && HEX_COLOR_REGEX.test(currentColor) ? currentColor : "#ffffff";

    const handleColorChange = (newColor: string) => {
      onChange?.(newColor);
    };

    return (
      <Field data-invalid={!!error} className={containerClassName}>
        {label && (
          <FieldLabel htmlFor={inputId} className={labelClassName}>
            {label}
          </FieldLabel>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {/* Swatch & Native Color Input Trigger */}
            <div className="relative flex-shrink-0">
              <button
                type="button"
                disabled={disabled}
                onClick={() => colorInputRef.current?.click()}
                className={cn(
                  "size-10 rounded-xl border border-border/80 shadow-sm transition-transform relative overflow-hidden flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !disabled && "hover:scale-105 active:scale-95 cursor-pointer",
                  disabled && "opacity-50 cursor-not-allowed",
                )}
                style={{ backgroundColor: swatchColor }}
                title={disabled ? undefined : "Wybierz kolor"}
                aria-label="Wybierz kolor"
              >
                <span className="sr-only">Wybierz kolor</span>
              </button>

              <input
                type="color"
                ref={colorInputRef}
                value={swatchColor.length === 7 ? swatchColor : "#ffffff"}
                disabled={disabled}
                onChange={(e) => {
                  handleColorChange(e.target.value);
                  onColorSelect?.(e.target.value);
                }}
                className="absolute inset-0 size-full opacity-0 pointer-events-none"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>

            {/* Hex Input */}
            <div className="relative flex-1">
              <input
                id={inputId}
                ref={ref}
                type="text"
                value={currentColor}
                disabled={disabled}
                onChange={(e) => handleColorChange(e.target.value)}
                placeholder="#000000"
                className={cn(
                  "w-full h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
                  error && "border-destructive focus-visible:ring-destructive",
                  className,
                )}
                {...props}
              />
            </div>
          </div>

          {/* Quick Presets */}
          {presetColors && presetColors.length > 0 && (
            <div className={cn("flex flex-wrap items-center gap-1.5 pt-1", disabled && "cursor-not-allowed")}>
              {presetColors.map((preset) => {
                const isSelected = !!currentColor && currentColor.toLowerCase() === preset.toLowerCase();
                return (
                  <button
                    key={preset}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      handleColorChange(preset);
                      onColorSelect?.(preset);
                    }}
                    className={cn(
                      "size-5 rounded-full border border-border/60 shadow-xs transition-all",
                      !disabled && "cursor-pointer hover:scale-115 active:scale-95",
                      disabled && "cursor-not-allowed opacity-35 filter grayscale-[0.35]",
                      isSelected && !disabled && "ring-2 ring-ring ring-offset-1 scale-110",
                      isSelected && disabled && "ring-1 ring-border/60",
                    )}
                    style={{ backgroundColor: preset }}
                    title={disabled ? undefined : preset}
                    aria-label={`Kolor ${preset}`}
                  />
                );
              })}
            </div>
          )}
        </div>

        {description && <FieldDescription>{description}</FieldDescription>}
        {error && <FieldError>{error}</FieldError>}
      </Field>
    );
  },
);

ColorPickerField.displayName = "ColorPickerField";
export default ColorPickerField;
