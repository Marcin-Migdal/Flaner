import React, { useCallback, useMemo } from "react";
import { TextField, type TextFieldProps } from "./TextField";
import { Select, type SelectOption } from "./Select";
import { moneyInputStyles as styles } from "./MoneyInput.styles";
import { cn } from "@flaner/shared/utils";

export type MoneyInputProps = Omit<TextFieldProps, "type"> & {
  currencyLabel?: string;
  currency?: string;
  defaultCurrency?: string;
  onCurrencyChange?: (currency: string) => void;
  currencyOptions?: SelectOption[];
  currencyDisabled?: boolean;
  currencyPlaceholder?: string;
  currencyError?: string;
  formatCurrencyOptionLabel?: (option: SelectOption, meta: { context: "menu" | "value" }) => React.ReactNode;
};

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  (
    {
      label,
      currencyLabel,
      description,
      error,
      currencyError,
      currency,
      defaultCurrency = "PLN",
      onCurrencyChange,
      currencyOptions,
      currencyDisabled = false,
      currencyPlaceholder,
      formatCurrencyOptionLabel,
      className,
      step = "0.01",
      min = "0",
      inputMode = "decimal",
      placeholder = "0.00",
      disabled,
      ...props
    },
    ref,
  ) => {
    const selectedCurrencyOption = useMemo(() => {
      const activeCode = currency ?? defaultCurrency;
      if (!currencyOptions || currencyOptions.length === 0) {
        return activeCode ? { value: activeCode, label: activeCode } : null;
      }
      return currencyOptions.find((opt) => opt.value === activeCode) ?? { value: activeCode, label: activeCode };
    }, [currencyOptions, currency, defaultCurrency]);

    const defaultFormatOptionLabel = useCallback(
      (option: SelectOption, meta: { context: "menu" | "value" }) => {
        return meta.context === "value" ? option.value : option.label;
      },
      [],
    );

    // Keep inputs aligned horizontally if label is present on amount but currencyLabel is omitted
    const resolvedCurrencyLabel = currencyLabel ?? (label ? "\u00A0" : undefined);

    return (
      <div className={cn(styles.controlsRow, className)}>
        <TextField
          ref={ref}
          type="number"
          step={step}
          min={min}
          inputMode={inputMode}
          placeholder={placeholder}
          label={label}
          description={description}
          error={error}
          disabled={disabled}
          {...props}
        />
        <Select
          label={resolvedCurrencyLabel}
          value={selectedCurrencyOption}
          onChange={(opt) => {
            if (opt && onCurrencyChange) {
              onCurrencyChange(opt.value);
            }
          }}
          options={currencyOptions}
          isDisabled={disabled || currencyDisabled}
          placeholder={currencyPlaceholder}
          error={currencyError}
          formatOptionLabel={formatCurrencyOptionLabel ?? defaultFormatOptionLabel}
          isSearchable={Boolean(currencyOptions && currencyOptions.length > 5)}
          aria-label={currencyLabel ?? "Currency"}
        />
      </div>
    );
  },
);

MoneyInput.displayName = "MoneyInput";
export default MoneyInput;
