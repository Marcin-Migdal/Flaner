import React from "react";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
  type RegisterOptions,
} from "react-hook-form";
import { toNumberOrNull, useFormField } from "../../hooks/useFormField";
import { MoneyInput, type MoneyInputProps } from "../MoneyInput";

export type FormMoneyInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TAmountName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TCurrencyName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = Omit<
  MoneyInputProps,
  "name" | "value" | "defaultValue" | "onChange" | "onBlur"
> & {
  name?: TAmountName;
  amountName?: TAmountName;
  currencyName?: TCurrencyName;
  control?: Control<TFieldValues>;
  rules?: RegisterOptions<TFieldValues, TAmountName>;
  amountRules?: RegisterOptions<TFieldValues, TAmountName>;
  currencyRules?: RegisterOptions<TFieldValues, TCurrencyName>;
  shouldUnregister?: boolean;
};

type FormMoneyInputInnerProps<
  TFieldValues extends FieldValues,
  TAmountName extends FieldPath<TFieldValues>,
> = Omit<
  MoneyInputProps,
  "name" | "value" | "defaultValue" | "onChange" | "onBlur"
> & {
  amountName: TAmountName;
  control?: Control<TFieldValues>;
  rules?: RegisterOptions<TFieldValues, TAmountName>;
  shouldUnregister?: boolean;
  currencyValue?: string;
  onCurrencyChange?: (currency: string) => void;
  currencyError?: string;
};

function FormMoneyInputInner<
  TFieldValues extends FieldValues,
  TAmountName extends FieldPath<TFieldValues>,
>({
  amountName,
  control,
  rules,
  shouldUnregister,
  currencyValue,
  onCurrencyChange,
  currencyError,
  error: externalError,
  disabled,
  ...props
}: FormMoneyInputInnerProps<TFieldValues, TAmountName>) {
  const { field: amountField, error: amountError } = useFormField({
    name: amountName,
    control,
    rules,
    shouldUnregister,
    disabled,
  });

  const displayError = externalError ?? amountError ?? currencyError;

  return (
    <MoneyInput
      {...props}
      ref={amountField.ref}
      name={amountField.name}
      value={amountField.value ?? ""}
      onChange={(e) => amountField.onChange(toNumberOrNull(e.target.value))}
      onBlur={amountField.onBlur}
      onStep={(_, nextVal) => amountField.onChange(nextVal)}
      currency={currencyValue}
      onCurrencyChange={onCurrencyChange}
      disabled={disabled}
      error={displayError}
    />
  );
}

export function FormMoneyInput<
  TFieldValues extends FieldValues = FieldValues,
  TAmountName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
  TCurrencyName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  amountName,
  currencyName,
  control,
  rules,
  amountRules,
  currencyRules,
  shouldUnregister,
  currency: propCurrency,
  onCurrencyChange: propOnCurrencyChange,
  ...props
}: FormMoneyInputProps<TFieldValues, TAmountName, TCurrencyName>) {
  // shortcut: TS cannot narrow `name` (TName) to TAmountName; they are the same field when amountName is omitted
  const resolvedAmountName = (amountName ?? name) as TAmountName;

  if (!resolvedAmountName) {
    throw new Error("FormMoneyInput requires either 'name' or 'amountName' to be specified.");
  }

  if (currencyName) {
    return (
      <Controller
        name={currencyName}
        control={control}
        rules={currencyRules}
        shouldUnregister={shouldUnregister}
        disabled={props.disabled}
        render={({ field: currencyField, fieldState: currencyFieldState }) => (
          <FormMoneyInputInner
            {...props}
            amountName={resolvedAmountName}
            control={control}
            rules={amountRules ?? rules}
            shouldUnregister={shouldUnregister}
            currencyValue={typeof currencyField.value === "string" ? currencyField.value : undefined}
            onCurrencyChange={(val) => {
              currencyField.onChange(val);
              propOnCurrencyChange?.(val);
            }}
            currencyError={currencyFieldState.error?.message}
          />
        )}
      />
    );
  }

  return (
    <FormMoneyInputInner
      {...props}
      amountName={resolvedAmountName}
      control={control}
      rules={amountRules ?? rules}
      shouldUnregister={shouldUnregister}
      currencyValue={propCurrency}
      onCurrencyChange={propOnCurrencyChange}
    />
  );
}

export default FormMoneyInput;
