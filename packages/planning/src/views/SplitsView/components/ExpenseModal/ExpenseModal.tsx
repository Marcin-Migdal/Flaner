import { useAuth } from "@flaner/shared/context";
import { toast } from "@flaner/shared/utils";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  FormDatePicker,
  FormMoneyInput,
  FormSelect,
  FormTextField,
  type SelectOption,
} from "@flaner/ui-components";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { useEffect, useMemo } from "react";
import { FormProvider, useForm, type DefaultValues } from "react-hook-form";
import {
  EXPENSE_CATEGORIES,
  type Expense,
  type ExpenseCategory,
  type ExpenseInput,
  type SplitGroup,
} from "../../../../api/splits";
import { useCreateExpenseMutation, useUpdateExpenseMutation } from "../../../../hooks/api/mutation";
import { useCurrencyOptions } from "@flaner/shared/hooks";
import { DEFAULT_CURRENCY } from "@flaner/shared/constants";
import { fromMinorUnits, splitEqually, toMinorUnits } from "@flaner/shared/utils";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import type { SplitGroupMember } from "../../../../hooks/useSplitGroupMembers";
import { EXPENSE_CATEGORY_ICONS } from "../../../../utils/expenseCategoryIcons";
import { getCreateExpenseSchema, type CreateExpenseFormData } from "../../../../utils/schemas";
import { expenseModalStyles as styles } from "./ExpenseModal.styles";
import { SplitEditor } from "./components/SplitEditor";

export type ExpenseModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: SplitGroup;
  members: SplitGroupMember[];
  expenseToEdit?: Expense | null;
};

const buildDefaultValues = (
  expense: Expense | null | undefined,
  group: SplitGroup,
  currentUserId: string,
): DefaultValues<CreateExpenseFormData> => {
  if (expense) {
    const splitMap = new Map(expense.splits.map((s) => [s.userId, s.amount]));
    const participantIds = Array.from(new Set([...group.participants, ...expense.splits.map((s) => s.userId)]));

    return {
      title: expense.title,
      amount: fromMinorUnits(expense.amount),
      currency: expense.currency,
      category: expense.category,
      date: parseISO(expense.date),
      paidBy: expense.paidBy,
      splitType: expense.splitType || "equally",
      splits: participantIds.map((userId) => {
        const splitAmount = splitMap.get(userId);
        return {
          userId,
          included: splitAmount !== undefined,
          amount: splitAmount !== undefined ? fromMinorUnits(splitAmount) : undefined,
        };
      }),
    };
  }

  return {
    title: "",
    amount: undefined as unknown as number,
    currency: group.lastUsedCurrency || group.defaultCurrency || DEFAULT_CURRENCY,
    category: "general",
    date: new Date(),
    paidBy: currentUserId,
    splitType: "equally",
    splits: group.participants.map((userId) => ({
      userId,
      included: true,
      amount: undefined,
    })),
  };
};

export const ExpenseModal = ({ open, onOpenChange, group, members, expenseToEdit = null }: ExpenseModalProps) => {
  const { t } = usePlanningTranslations();
  const { user } = useAuth();
  const currentUserId = user?.uid ?? "";
  const isEdit = expenseToEdit !== null;

  const currencyOptions = useCurrencyOptions();
  const { mutateAsync: createExpense, isPending: isCreating } = useCreateExpenseMutation();
  const { mutateAsync: updateExpense, isPending: isUpdating } = useUpdateExpenseMutation();
  const isPending = isCreating || isUpdating;

  const methods = useForm<CreateExpenseFormData>({
    resolver: zodResolver(getCreateExpenseSchema(t)),
    defaultValues: buildDefaultValues(expenseToEdit, group, currentUserId),
  });

  useEffect(() => {
    if (open) {
      methods.reset(buildDefaultValues(expenseToEdit, group, currentUserId));
    }
  }, [open, expenseToEdit, group, currentUserId, methods]);

  const membersById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  const memberOptions = useMemo(
    () =>
      members.map((member) => ({
        value: member.id,
        label: member.isCurrentUser ? t("splits.you") : member.name,
      })),
    [members, t],
  );

  const categoryOptions = useMemo(
    () =>
      EXPENSE_CATEGORIES.map((cat) => ({
        value: cat,
        label: t(`splits.categories.${cat}`),
      })),
    [t],
  );

  const onSubmit = async (data: CreateExpenseFormData) => {
    const totalMinor = toMinorUnits(data.amount);
    let splits: { userId: string; amount: number }[];

    if (data.splitType === "equally") {
      const includedIds = data.splits.filter((s) => s.included).map((s) => s.userId);
      splits = splitEqually(totalMinor, includedIds);
    } else {
      splits = data.splits
        .filter((s) => (s.amount ?? 0) > 0)
        .map((s) => ({
          userId: s.userId,
          amount: toMinorUnits(s.amount ?? 0),
        }));
    }

    const expenseInput: ExpenseInput = {
      title: data.title.trim(),
      amount: totalMinor,
      currency: data.currency,
      category: data.category,
      date: format(data.date, "yyyy-MM-dd"),
      paidBy: data.paidBy,
      splitType: data.splitType,
      splits,
    };

    if (expenseToEdit) {
      const isCreator = (expenseToEdit.createdBy || expenseToEdit.paidBy) === currentUserId;
      if (!isCreator) {
        toast.failure(t("errors.notAuthorizedToEditExpense"));
        return;
      }

      try {
        await updateExpense(
          {
            groupId: group.id,
            expenseId: expenseToEdit.id,
            data: expenseInput,
          },
          {
            onSuccess: () => onOpenChange(false),
          },
        );
      } catch {
        // Handled by mutation's global onError toast
      }
      return;
    }

    try {
      await createExpense(
        {
          groupId: group.id,
          data: expenseInput,
        },
        {
          onSuccess: () => onOpenChange(false),
        },
      );
    } catch {
      // Handled by mutation's global onError toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={styles.content}>
        <DialogHeader className={styles.header}>
          <DialogTitle>{isEdit ? t("splits.expenseModal.editTitle") : t("splits.expenseModal.title")}</DialogTitle>
        </DialogHeader>

        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit, (errors) => console.error("ExpenseForm validation errors:", errors))}>
            <div className={styles.body}>
              <FormTextField
                name="title"
                label={t("splits.fields.title")}
                placeholder={t("splits.fields.title")}
              />

              <FormMoneyInput
                amountName="amount"
                currencyName="currency"
                label={t("splits.fields.amount")}
                currencyLabel={t("splits.fields.currency")}
                currencyOptions={currencyOptions}
              />

              <div className={styles.grid}>
                <FormSelect
                  name="category"
                  label={t("splits.fields.category")}
                  options={categoryOptions}
                  formatOptionLabel={(option: SelectOption) => {
                    const Icon = EXPENSE_CATEGORY_ICONS[option.value as ExpenseCategory];
                    return (
                      <div className="flex items-center gap-2">
                        {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" />}
                        <span>{option.label}</span>
                      </div>
                    );
                  }}
                />
                <FormDatePicker name="date" label={t("splits.fields.date")} />
              </div>

              <FormSelect
                name="paidBy"
                label={t("splits.fields.paidBy")}
                options={memberOptions}
                isSearchable={memberOptions.length > 8}
              />

              <SplitEditor membersById={membersById} />
            </div>

            <div className={styles.footer}>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                {t("splits.actions.cancel")}
              </Button>
              <Button type="submit" variant="brand" isBusy={isPending}>
                {isEdit ? t("splits.actions.save") : t("splits.actions.addExpense")}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};
