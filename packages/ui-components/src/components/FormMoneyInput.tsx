import React from "react";
import {
  Controller,
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
  type RegisterOptions,
} from "react-hook-form";
import { MoneyInput, type MoneyInputProps } from "./MoneyInput";

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
  const { field: amountField, fieldState: amountFieldState } = useController({
    name: amountName,
    control,
    rules,
    shouldUnregister,
    disabled,
  });

  const displayError = externalError ?? amountFieldState.error?.message ?? currencyError;

  return (
    <MoneyInput
      {...props}
      ref={amountField.ref}
      name={amountField.name}
      value={amountField.value ?? ""}
      onChange={(e) => {
        const val = e.target.value;
        amountField.onChange(val === "" ? undefined : Number(val));
      }}
      onBlur={amountField.onBlur}
      onStep={(_, nextVal) => {
        amountField.onChange(nextVal);
      }}
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
            currencyValue={currencyField.value as string | undefined}
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
