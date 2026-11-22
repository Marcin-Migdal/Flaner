import { useCurrencyOptions } from "@flaner/shared/hooks";
import { fromMinorUnits, toMinorUnits } from "@flaner/shared/utils";
import {
  Button,
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
import { format } from "date-fns";
import { useEffect, useMemo } from "react";
import { FormProvider, useController, useForm, useWatch, type DefaultValues } from "react-hook-form";
import {
  BUDGET_CATEGORY_TYPES,
  type BudgetAccount,
  type BudgetCategoryTree,
  type BudgetProfile,
  type BudgetTransactionInput,
} from "../../api/budget";
import { useAddBudgetTransactionMutation } from "../../hooks/api/mutation";
import { useGetExchangeRateQuery } from "../../hooks/api/query";
import { useBudgetWriteErrorToast } from "../../hooks/useBudgetWriteErrorToast";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { getBudgetTransactionSchema, type BudgetTransactionFormData } from "../../utils/schemas";
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
};

const isCategoryType = (value: string): value is BudgetTransactionFormData["type"] =>
  BUDGET_CATEGORY_TYPES.some((type) => type === value);

const defaultValues = (profile: BudgetProfile, accounts: BudgetAccount[]): DefaultValues<BudgetTransactionFormData> => {
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

/** Add transaction (manual entry). A transaction saved with a category is confirmed. */
export const BudgetTransactionDialog = ({
  open,
  onOpenChange,
  profile,
  accounts,
  categories,
  saveDisabled,
}: BudgetTransactionDialogProps) => {
  const { t } = usePlanningTranslations();
  const currencyOptions = useCurrencyOptions();
  const showWriteError = useBudgetWriteErrorToast();
  const { mainCurrency } = profile;
  const { mutateAsync: addTransaction, isPending } = useAddBudgetTransactionMutation();

  const methods = useForm<BudgetTransactionFormData>({
    resolver: zodResolver(getBudgetTransactionSchema(t, mainCurrency)),
    defaultValues: defaultValues(profile, accounts),
  });
  const { control, setValue, reset, handleSubmit } = methods;

  useEffect(() => {
    if (open) reset(defaultValues(profile, accounts));
  }, [open, profile, accounts, reset]);

  const [type, amount, currency, date, rateOverridden, accountId] = useWatch({
    control,
    name: ["type", "amount", "currency", "date", "rateOverridden", "accountId"],
  });

  // Picking an account switches to its default currency
  useEffect(() => {
    const account = accounts.find((candidate) => candidate.id === accountId);
    if (account) setValue("currency", account.defaultCurrency);
  }, [accountId, accounts, setValue]);
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
  const { field: categoryField } = useController({ control, name: "categoryId" });
  const { field: accountField, fieldState: accountState } = useController({ control, name: "accountId" });

  const accountOptions = useMemo(
    () => accounts.map((account) => ({ value: account.id, label: account.name })),
    [accounts],
  );

  const onSubmit = async (data: BudgetTransactionFormData) => {
    const amountMinor = toMinorUnits(data.amount);
    const day = format(data.date, "yyyy-MM-dd");
    const foreign = data.currency !== mainCurrency;
    const amountMain = foreign && data.amountMain !== null ? toMinorUnits(data.amountMain) : amountMinor;
    // Without a published rate (e.g. the rate service is down) the typed amount defines the rate
    const usedRate = foreign ? (rate ?? { rate: amountMain / amountMinor, date: day }) : { rate: 1, date: day };

    const input: BudgetTransactionInput = {
      accountId: data.accountId,
      date: day,
      type: data.type,
      amount: amountMinor,
      currency: data.currency,
      amountMain,
      rate: usedRate.rate,
      rateDate: usedRate.date,
      rateOverridden: foreign && (data.rateOverridden || !rate),
      payee: data.payee.trim(),
      description: data.description.trim(),
      categoryId: data.categoryId,
      confirmed: data.categoryId !== null,
      excluded: false,
    };

    try {
      await addTransaction(input);
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
          <DialogTitle>{t("budget.transactionForm.title")}</DialogTitle>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className={styles.body}>
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
                    <TabsTrigger key={value} value={value}>
                      {t(`budget.transactionForm.types.${value}`)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <FormMoneyInput
                amountName="amount"
                currencyName="currency"
                label={t("budget.transactionForm.amount")}
                currencyLabel={t("budget.transactionForm.currency")}
                currencyOptions={currencyOptions}
                onCurrencyChange={() => setValue("rateOverridden", false)}
              />

              {isForeign && (
                <div className={styles.conversion}>
                  <MoneyInput
                    ref={amountMainField.ref}
                    name={amountMainField.name}
                    label={t("budget.transactionForm.amountMain", { currency: mainCurrency })}
                    currencyLabel={t("budget.transactionForm.currency")}
                    currency={mainCurrency}
                    currencyDisabled
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
                    {!isRateFetching && rate && t("budget.transactionForm.rate", { rate: rate.rate, date: rate.date })}
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
                <FormDatePicker name="date" label={t("budget.transactionForm.date")} />
                {/* Not `FormSelect disabled`: react-hook-form would drop a disabled field's value on submit */}
                <Select
                  label={t("budget.transactionForm.account")}
                  name={accountField.name}
                  options={accountOptions}
                  value={accountOptions.find((option) => option.value === accountField.value) ?? null}
                  onChange={(option) => option && accountField.onChange(option.value)}
                  onBlur={accountField.onBlur}
                  error={accountState.error?.message}
                  disabled={accounts.length < 2}
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
              <Button type="submit" variant="brand" isBusy={isPending} disabled={saveDisabled}>
                {t("budget.transactionForm.save")}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
