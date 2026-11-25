import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  FormDatePicker,
  FormSelect,
  FormTextField,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { getISODay, parseISO } from "date-fns";
import { useEffect, useMemo } from "react";
import { FormProvider, useController, useForm, useWatch } from "react-hook-form";
import {
  REPEAT_END_TYPES,
  REPEAT_FREQUENCIES,
  type BudgetRecurring,
  type BudgetTransaction,
  type IsoWeekday,
  type RepeatPattern,
} from "../../api/budget";
import { useMakeBudgetRecurringMutation, useUpdateBudgetRecurringRuleMutation } from "../../hooks/api/mutation";
import { useBudgetWriteErrorToast } from "../../hooks/useBudgetWriteErrorToast";
import { usePlanningTranslations } from "../../hooks/usePlanningTranslations";
import { useRepeatRuleText, useWeekdayNames } from "../../hooks/useRepeatRuleText";
import { occurrences, resolveRepeatEnd, todayDay } from "../../utils/repeatRules";
import { getBudgetRecurringSchema, toRepeatRuleInput, type BudgetRecurringFormData } from "../../utils/schemas";
import { recurringRuleDialogStyles as styles } from "./RecurringRuleDialog.styles";

const WEEKDAYS: IsoWeekday[] = [1, 2, 3, 4, 5, 6, 7];
const PREVIEW_COUNT = 3;

export type RecurringRuleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Make recurring: this transaction becomes the first occurrence (the rule starts on its date). */
  transaction?: BudgetTransaction | null;
  /** Edit rule: the new rule applies from today. */
  recurring?: BudgetRecurring | null;
  /** Disables saving (e.g. offline). */
  saveDisabled?: boolean;
};

const isFrequency = (value: string): value is BudgetRecurringFormData["frequency"] =>
  REPEAT_FREQUENCIES.some((frequency) => frequency === value);

const defaultValues = (start: Date, recurring?: BudgetRecurring | null): BudgetRecurringFormData => {
  const fromStart: BudgetRecurringFormData = {
    frequency: "monthly",
    interval: 1,
    weekdays: WEEKDAYS.filter((weekday) => weekday === getISODay(start)),
    monthDay: start.getDate(),
    yearMonth: start.getMonth() + 1,
    yearDay: start.getDate(),
    endType: "never",
    endDate: null,
    endCount: null,
  };
  if (!recurring) return fromStart;

  const { pattern, end } = recurring.rule;
  const patternValues = (rule: RepeatPattern): Partial<BudgetRecurringFormData> => {
    if (rule.frequency === "weekly") return { weekdays: rule.weekdays };
    if (rule.frequency === "monthly") return { monthDay: rule.day };
    return { yearMonth: rule.month, yearDay: rule.day };
  };
  return {
    ...fromStart,
    ...patternValues(pattern),
    frequency: pattern.frequency,
    interval: pattern.interval,
    endType: end.type,
    endDate: end.type === "until" ? parseISO(end.date) : null,
    endCount: end.type === "after" ? end.count : null,
  };
};

/** The repeat rule editor: Make recurring (from a transaction) or Edit rule (of a recurring transaction). */
export const RecurringRuleDialog = ({ open, onOpenChange, transaction, recurring, saveDisabled }: RecurringRuleDialogProps) => {
  const { t, i18n } = usePlanningTranslations();
  const showWriteError = useBudgetWriteErrorToast();
  const describeRule = useRepeatRuleText();
  const weekdayName = useWeekdayNames();
  const { mutateAsync: makeRecurring, isPending: isMaking } = useMakeBudgetRecurringMutation();
  const { mutateAsync: updateRule, isPending: isUpdating } = useUpdateBudgetRecurringRuleMutation();
  const isPending = isMaking || isUpdating;

  // A new rule starts on the transaction's date; an edited one today
  const startDay = transaction?.date ?? todayDay();
  const start = useMemo(() => parseISO(startDay), [startDay]);
  const schema = useMemo(() => getBudgetRecurringSchema(t, start), [t, start]);

  const methods = useForm<BudgetRecurringFormData>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(start, recurring),
  });
  const { control, setValue, reset, handleSubmit } = methods;

  useEffect(() => {
    if (open) reset(defaultValues(start, recurring));
  }, [open, start, recurring, reset]);

  const values = useWatch({ control });
  const { field: weekdaysField, fieldState: weekdaysState } = useController({ control, name: "weekdays" });
  const { field: monthDayField } = useController({ control, name: "monthDay" });
  const { field: yearMonthField } = useController({ control, name: "yearMonth" });
  const { field: yearDayField } = useController({ control, name: "yearDay" });

  const dayOptions = Array.from({ length: 31 }, (_, index) => ({ value: String(index + 1), label: String(index + 1) }));
  const monthDayOptions = [...dayOptions, { value: "last", label: t("budget.recurringForm.lastDay") }];
  const monthFormat = new Intl.DateTimeFormat(i18n.language, { month: "long" });
  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1),
    label: monthFormat.format(new Date(2024, index, 1)),
  }));
  const endOptions = REPEAT_END_TYPES.map((value) => ({ value, label: t(`budget.recurringForm.ends.${value}`) }));
  const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium" });

  // What the rule means, once the form is valid: its words and the next few due dates
  const parsed = schema.safeParse(values);
  const preview = (() => {
    if (!parsed.success) return null;
    const { pattern, end } = toRepeatRuleInput(parsed.data);
    const rule = { pattern, start: startDay, end: resolveRepeatEnd(pattern, startDay, end) };
    const next: string[] = [];
    for (const day of occurrences(rule)) {
      if (next.length === PREVIEW_COUNT) break;
      next.push(day);
    }
    return { text: describeRule(rule), next: next.map((day) => dateFormat.format(parseISO(day))).join(", ") };
  })();

  const onSubmit = async (data: BudgetRecurringFormData) => {
    const rule = toRepeatRuleInput(data);
    try {
      if (recurring) await updateRule({ recurring, rule });
      else if (transaction) await makeRecurring({ transaction, rule });
      onOpenChange(false);
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, { retry: () => void handleSubmit(onSubmit)(), fallbackKey: "toasts.budget.saveError" });
      }
    }
  };

  const frequency = values.frequency ?? "monthly";
  const selectedWeekdays = weekdaysField.value;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.content}>
        <DialogHeader className={styles.header}>
          <DialogTitle>{t(recurring ? "budget.recurringForm.editTitle" : "budget.recurringForm.title")}</DialogTitle>
          <DialogDescription>
            {recurring
              ? t("budget.recurringForm.editDescription", { payee: recurring.payee })
              : t("budget.recurringForm.description", {
                  payee: transaction?.payee ?? "",
                  date: dateFormat.format(start),
                })}
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className={styles.body}>
              <Tabs
                className={styles.frequencyTabs}
                value={frequency}
                onValueChange={(value) => isFrequency(value) && setValue("frequency", value)}
              >
                <TabsList className={styles.frequencyTabsList} aria-label={t("budget.recurringForm.frequency")}>
                  {REPEAT_FREQUENCIES.map((value) => (
                    <TabsTrigger key={value} value={value}>
                      {t(`budget.recurringForm.frequencies.${value}`)}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <FormTextField
                name="interval"
                type="number"
                min={1}
                max={99}
                label={t("budget.recurringForm.interval")}
                description={t(`budget.recurringForm.units.${frequency}`, { count: values.interval ?? 1 })}
              />

              {frequency === "weekly" && (
                <fieldset className={styles.weekdays}>
                  <legend className={styles.weekdaysLabel}>{t("budget.recurringForm.weekdays")}</legend>
                  <div className={styles.weekdayButtons}>
                    {WEEKDAYS.map((weekday) => {
                      const pressed = selectedWeekdays.includes(weekday);
                      return (
                        <Button
                          key={weekday}
                          type="button"
                          size="sm"
                          variant={pressed ? "brand" : "outline"}
                          className={styles.weekdayButton}
                          aria-pressed={pressed}
                          onClick={() =>
                            weekdaysField.onChange(
                              pressed
                                ? selectedWeekdays.filter((day) => day !== weekday)
                                : [...selectedWeekdays, weekday],
                            )
                          }
                        >
                          {weekdayName(weekday)}
                        </Button>
                      );
                    })}
                  </div>
                  {weekdaysState.error && <p className={styles.error}>{weekdaysState.error.message}</p>}
                </fieldset>
              )}

              {frequency === "monthly" && (
                <Select
                  label={t("budget.recurringForm.monthDay")}
                  name={monthDayField.name}
                  options={monthDayOptions}
                  value={monthDayOptions.find((option) => option.value === String(monthDayField.value)) ?? null}
                  onChange={(option) => option && monthDayField.onChange(option.value === "last" ? "last" : Number(option.value))}
                  onBlur={monthDayField.onBlur}
                  description={t("budget.recurringForm.monthDayHint")}
                />
              )}

              {frequency === "yearly" && (
                <div className={styles.grid}>
                  <Select
                    label={t("budget.recurringForm.yearMonth")}
                    name={yearMonthField.name}
                    options={monthOptions}
                    value={monthOptions.find((option) => option.value === String(yearMonthField.value)) ?? null}
                    onChange={(option) => option && yearMonthField.onChange(Number(option.value))}
                    onBlur={yearMonthField.onBlur}
                  />
                  <Select
                    label={t("budget.recurringForm.yearDay")}
                    name={yearDayField.name}
                    options={dayOptions}
                    value={dayOptions.find((option) => option.value === String(yearDayField.value)) ?? null}
                    onChange={(option) => option && yearDayField.onChange(Number(option.value))}
                    onBlur={yearDayField.onBlur}
                  />
                </div>
              )}

              <div className={styles.grid}>
                <FormSelect name="endType" label={t("budget.recurringForm.end")} options={endOptions} />
                {values.endType === "until" && <FormDatePicker name="endDate" label={t("budget.recurringForm.endDate")} />}
                {values.endType === "after" && (
                  <FormTextField
                    name="endCount"
                    type="number"
                    min={1}
                    max={999}
                    label={t("budget.recurringForm.endCount")}
                  />
                )}
              </div>

              {preview && (
                <div className={styles.preview} aria-live="polite">
                  <p className={styles.previewRule}>{preview.text}</p>
                  <p className={styles.previewNext}>
                    {preview.next
                      ? t("budget.recurringForm.nextDates", { dates: preview.next })
                      : t("budget.recurringForm.noDates")}
                  </p>
                </div>
              )}
            </div>

            <div className={styles.footer}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                {t("budget.recurringForm.cancel")}
              </Button>
              <Button type="submit" variant="brand" isBusy={isPending} disabled={saveDisabled}>
                {t(recurring ? "budget.recurringForm.saveEdit" : "budget.recurringForm.save")}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
