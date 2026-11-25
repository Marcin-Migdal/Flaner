import { useCurrencyOptions } from "@flaner/shared/hooks";
import { fromMinorUnits, toMinorUnits } from "@flaner/shared/utils";
import {
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  FormDatePicker,
  FormMoneyInput,
  FormTextField,
  MoneyInput,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { useEffect, useMemo } from "react";
import { FormProvider, useController, useForm, useWatch, type DefaultValues } from "react-hook-form";
import {
  BUDGET_CATEGORY_TYPES,
  type BudgetAccount,
  type BudgetCategoryTree,
  type BudgetProfile,
  type BudgetTransaction,
  type BudgetTransactionInput,
} from "../../api/budget";
import { useAddBudgetTransactionMutation, useUpdateBudgetTransactionsMutation } from "../../hooks/api/mutation";
import { useGetExchangeRateQuery } from "../../hooks/api/query";
import { useBudgetWriteErrorToast } from "../../hooks/useBudgetWriteErrorToast";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { getBudgetTransactionSchema, type BudgetTransactionFormData } from "../../utils/schemas";
import { sortBudgetAccounts } from "../../utils/sortBudgetAccounts";
import { isRefundLinked } from "../../utils/splitOffs";
import { CategoryPicker } from "../CategoryPicker";
import { budgetTransactionDialogStyles as styles } from "./BudgetTransactionDialog.styles";

export type BudgetTransactionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: BudgetProfile;
  accounts: BudgetAccount[];
  categories: BudgetCategoryTree;
  /** Disables saving (e.g. offline). */
  saveDisabled?: boolean;
  /** Edits this transaction (every field) instead of adding one; a new date or account moves it. */
  transaction?: BudgetTransaction | null;
};

const isCategoryType = (value: string): value is BudgetTransactionFormData["type"] =>
  BUDGET_CATEGORY_TYPES.some((type) => type === value);

const defaultValues = (
  profile: BudgetProfile,
  accounts: BudgetAccount[],
  transaction?: BudgetTransaction | null,
): DefaultValues<BudgetTransactionFormData> => {
  if (transaction) {
    return {
      type: transaction.type,
      amount: fromMinorUnits(transaction.amount),
      currency: transaction.currency,
      amountMain: transaction.currency === profile.mainCurrency ? null : fromMinorUnits(transaction.amountMain),
      rateOverridden: transaction.rateOverridden,
      date: parseISO(transaction.date),
      payee: transaction.payee,
      description: transaction.description,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
    };
  }
  const mainAccount = accounts.find((account) => account.id === profile.mainAccountId) ?? accounts[0];
  return {
    type: "expense",
    amount: undefined,
    currency: mainAccount?.defaultCurrency ?? profile.mainCurrency,
    amountMain: null,
    rateOverridden: false,
    date: new Date(),
    payee: "",
    description: "",
    accountId: mainAccount?.id ?? "",
    categoryId: null,
  };
};

/**
 * Add transaction (manual entry; saved with a category it is confirmed), or with `transaction` edit one: a changed
 * category confirms it, the frozen import fields stay as they are. While a refund is linked, both sides keep their
 * type, date and account, and the refund keeps its amount (shown read-only).
 */
export const BudgetTransactionDialog = ({
  open,
  onOpenChange,
  profile,
  accounts,
  categories,
  saveDisabled,
  transaction,
}: BudgetTransactionDialogProps) => {
  const { t, i18n } = usePlanningTranslations();
  const currencyOptions = useCurrencyOptions();
  const showWriteError = useBudgetWriteErrorToast();
  const { mainCurrency } = profile;
  const { mutateAsync: addTransaction, isPending: isAdding } = useAddBudgetTransactionMutation();
  const { mutateAsync: updateTransactions, isPending: isUpdating } = useUpdateBudgetTransactionsMutation();
  const isPending = isAdding || isUpdating;
  const isLinked = !!transaction && isRefundLinked(transaction);
  const isAmountLocked = !!transaction?.refundOf;

  const methods = useForm<BudgetTransactionFormData>({
    resolver: zodResolver(getBudgetTransactionSchema(t, mainCurrency)),
    defaultValues: defaultValues(profile, accounts, transaction),
  });
  const { control, setValue, reset, handleSubmit } = methods;

  useEffect(() => {
    if (open) reset(defaultValues(profile, accounts, transaction));
  }, [open, profile, accounts, transaction, reset]);

  const [type, amount, currency, date, rateOverridden] = useWatch({
    control,
    name: ["type", "amount", "currency", "date", "rateOverridden"],
  });
  const isForeign = !!currency && currency !== mainCurrency;
  const rateDay = date ? format(date, "yyyy-MM-dd") : "";
  const { data: rate, isFetching: isRateFetching, isError: isRateError } = useGetExchangeRateQuery({
    from: currency,
    to: mainCurrency,
    date: rateDay,
  });

  // The main-currency amount follows the rate until the user types their own
  useEffect(() => {
    if (!isForeign || rateOverridden || !rate || !amount) return;
    setValue("amountMain", fromMinorUnits(Math.round(toMinorUnits(amount) * rate.rate)), { shouldValidate: false });
  }, [isForeign, rateOverridden, rate, amount, setValue]);

  const { field: amountMainField, fieldState: amountMainState } = useController({ control, name: "amountMain" });
  const { field: dateField } = useController({ control, name: "date" });
  const { field: categoryField } = useController({ control, name: "categoryId" });
  const { field: accountField, fieldState: accountState } = useController({ control, name: "accountId" });

  const accountOptions = useMemo(
    () =>
      sortBudgetAccounts(accounts, profile.mainAccountId, i18n.language).map((account) => ({
        value: account.id,
        label: account.name,
      })),
    [accounts, profile.mainAccountId, i18n.language],
  );

  const onSubmit = async (data: BudgetTransactionFormData) => {
    const amountMinor = toMinorUnits(data.amount);
    const day = format(data.date, "yyyy-MM-dd");
    const foreign = data.currency !== mainCurrency;
    const amountMain = foreign && data.amountMain !== null ? toMinorUnits(data.amountMain) : amountMinor;
    // Without a published rate (e.g. the rate service is down) the typed amount defines the rate
    const usedRate = foreign ? (rate ?? { rate: amountMain / amountMinor, date: day }) : { rate: 1, date: day };

    // An edit that keeps amount, currency, date and main-currency amount keeps the stored conversion as it was
    const keepConversion =
      !!transaction &&
      transaction.amount === amountMinor &&
      transaction.currency === data.currency &&
      transaction.date === day &&
      transaction.amountMain === amountMain;
    const conversion = keepConversion
      ? { rate: transaction.rate, rateDate: transaction.rateDate, rateOverridden: transaction.rateOverridden }
      : { rate: usedRate.rate, rateDate: usedRate.date, rateOverridden: foreign && (data.rateOverridden || !rate) };

    const input = {
      accountId: data.accountId,
      date: day,
      type: data.type,
      amount: amountMinor,
      currency: data.currency,
      amountMain,
      ...conversion,
      payee: data.payee.trim(),
      description: data.description.trim(),
      categoryId: data.categoryId,
    };

    try {
      if (transaction) {
        // An unchanged category keeps its confirmation; a picked one is confirmed
        const confirmed =
          data.categoryId === transaction.categoryId ? transaction.confirmed : data.categoryId !== null;
        await updateTransactions([{ ref: transaction, patch: { ...input, confirmed } }]);
      } else {
        const added: BudgetTransactionInput = { ...input, confirmed: data.categoryId !== null, excluded: false };
        await addTransaction(added);
      }
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, {
          retry: () => void handleSubmit(onSubmit)(),
          fallbackKey: "toasts.budget.saveError",
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.content}>
        <DialogHeader className={styles.header}>
          <DialogTitle>{t(transaction ? "budget.transactionForm.editTitle" : "budget.transactionForm.title")}</DialogTitle>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className={styles.body}>
              {isLinked && <p className={styles.lockedHint}>{t("budget.transactionForm.linkedLocked")}</p>}
              <Tabs
                className={styles.typeTabs}
                value={type}
                onValueChange={(value) => {
                  if (!isCategoryType(value) || value === type) return;
                  setValue("type", value);
                  // A category belongs to one type's tree
                  setValue("categoryId", null);
                }}
              >
                <TabsList className={styles.typeTabsList} aria-label={t("budget.transactionForm.type")}>
                  {BUDGET_CATEGORY_TYPES.map((value) => (
                    <TabsTrigger key={value} value={value} disabled={isLinked && value !== type}>
                      {t(`budget.transactionForm.types.${value}`)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {/* Read-only, not `disabled` form fields: react-hook-form would drop a disabled field's value on submit */}
              {isAmountLocked ? (
                <MoneyInput
                  label={t("budget.transactionForm.amount")}
                  currencyLabel={t("budget.transactionForm.currency")}
                  currency={currency}
                  value={amount ?? ""}
                  readOnly
                  disabled
                  currencyDisabled
                />
              ) : (
                <FormMoneyInput
                  amountName="amount"
                  currencyName="currency"
                  label={t("budget.transactionForm.amount")}
                  currencyLabel={t("budget.transactionForm.currency")}
                  currencyOptions={currencyOptions}
                  onCurrencyChange={() => setValue("rateOverridden", false)}
                />
              )}

              {isForeign && (
                <div className={styles.conversion}>
                  {/* Not `FormMoneyInput`: typing here must also set `rateOverridden` */}
                  <MoneyInput
                    ref={amountMainField.ref}
                    name={amountMainField.name}
                    label={t("budget.transactionForm.amountMain", { currency: mainCurrency })}
                    currencyLabel={t("budget.transactionForm.currency")}
                    currency={mainCurrency}
                    currencyDisabled
                    disabled={isAmountLocked}
                    value={amountMainField.value ?? ""}
                    error={amountMainState.error?.message}
                    onBlur={amountMainField.onBlur}
                    onChange={(event) => {
                      amountMainField.onChange(event.target.value === "" ? null : Number(event.target.value));
                      setValue("rateOverridden", true);
                    }}
                  />
                  <p className={styles.conversionHint} aria-live="polite">
                    {isRateFetching && t("budget.transactionForm.rateLoading")}
                    {!isRateFetching &&
                      rate &&
                      t("budget.transactionForm.rate", {
                        rate: new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 6 }).format(rate.rate),
                        date: new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" }).format(parseISO(rate.date)),
                      })}
                    {!isRateFetching && isRateError && t("budget.transactionForm.rateMissing")}
                    {rateOverridden && rate && (
                      <Button type="button" variant="link" size="xs" onClick={() => setValue("rateOverridden", false)}>
                        {t("budget.transactionForm.useRate")}
                      </Button>
                    )}
                  </p>
                </div>
              )}

              <div className={styles.grid}>
                {isLinked ? (
                  <DatePicker label={t("budget.transactionForm.date")} value={dateField.value} disabled />
                ) : (
                  <FormDatePicker name="date" label={t("budget.transactionForm.date")} />
                )}
                {/* Not `FormSelect disabled`: react-hook-form would drop a disabled field's value on submit */}
                <Select
                  label={t("budget.transactionForm.account")}
                  name={accountField.name}
                  options={accountOptions}
                  value={accountOptions.find((option) => option.value === accountField.value) ?? null}
                  onChange={(option) => {
                    if (!option) return;
                    accountField.onChange(option.value);
                    // Picking an account switches to its default currency
                    const account = accounts.find((candidate) => candidate.id === option.value);
                    if (account) setValue("currency", account.defaultCurrency);
                  }}
                  onBlur={accountField.onBlur}
                  error={accountState.error?.message}
                  disabled={accounts.length < 2 || isLinked}
                />
              </div>

              <FormTextField name="payee" label={t("budget.transactionForm.payee")} autoComplete="off" />
              <FormTextField
                name="description"
                label={t("budget.transactionForm.description")}
                description={t("budget.transactionForm.optional")}
                autoComplete="off"
              />

              <CategoryPicker
                label={t("budget.transactionForm.category")}
                tree={categories}
                type={type}
                value={categoryField.value}
                onChange={categoryField.onChange}
              />
            </div>

            <div className={styles.footer}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                {t("budget.transactionForm.cancel")}
              </Button>
              {/* Never saves an amount computed from the previous date's / currency's rate */}
              <Button type="submit" variant="brand" isBusy={isPending} disabled={saveDisabled || (isForeign && isRateFetching)}>
                {t(transaction ? "budget.transactionForm.saveEdit" : "budget.transactionForm.save")}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
