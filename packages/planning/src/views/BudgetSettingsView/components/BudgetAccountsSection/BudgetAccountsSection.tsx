import { useCurrencyOptions } from "@flaner/shared/hooks";
import {
  Badge,
  Button,
  Card,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  ListItem,
  LoadingFallback,
  Select,
  type SelectOption,
} from "@flaner/ui-components";
import { Eye, EyeOff, MoreHorizontal, Pencil, Plus, Star, Trash2, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import type { BudgetAccount } from "../../../../api/budget";
import {
  useSetBudgetMainCurrencyMutation,
  useSetMainBudgetAccountMutation,
  useUpdateBudgetAccountMutation,
} from "../../../../hooks/api/mutation";
import {
  useGetBudgetAccountsQuery,
  useGetBudgetAccountsWithTransactionsQuery,
  useGetBudgetProfileQuery,
} from "../../../../hooks/api/query";
import { useBudgetWriteErrorToast } from "../../../../hooks/useBudgetWriteErrorToast";
import { useIsOnline } from "../../../../hooks/useIsOnline";
import { usePlanningTranslations } from "../../../../hooks/usePlanningTranslations";
import { sortBudgetAccounts } from "../../../../utils/sortBudgetAccounts";
import { BudgetAccountDialog } from "../BudgetAccountDialog";
import { DeleteBudgetAccountDialog } from "../DeleteBudgetAccountDialog";
import { budgetAccountsSectionStyles as styles } from "./BudgetAccountsSection.styles";

const showCode = (option: SelectOption, { context }: { context: string }) =>
  context === "value" ? option.value : option.label;

/** The open account dialog: add, or edit the given account. */
type AccountDialog = { mode: "add" } | { mode: "edit"; account: BudgetAccount };

/**
 * Settings → Accounts & security: the accounts (main first, then alphabetical) with add, edit, make main,
 * hide / show and delete, and the main currency (locked once any transaction exists).
 */
export const BudgetAccountsSection = () => {
  const { t, i18n } = usePlanningTranslations();
  const currencyOptions = useCurrencyOptions();
  const isOnline = useIsOnline();
  const showWriteError = useBudgetWriteErrorToast();

  const profile = useGetBudgetProfileQuery();
  const accounts = useGetBudgetAccountsQuery();
  const withTransactions = useGetBudgetAccountsWithTransactionsQuery(accounts.data);
  const { mutateAsync: updateAccount } = useUpdateBudgetAccountMutation();
  const { mutateAsync: setMainAccount } = useSetMainBudgetAccountMutation();
  const { mutateAsync: setMainCurrency, isPending: isSettingCurrency } = useSetBudgetMainCurrencyMutation();

  const [dialog, setDialog] = useState<AccountDialog | null>(null);
  const [toDelete, setToDelete] = useState<BudgetAccount | null>(null);

  const mainAccountId = profile.data?.mainAccountId ?? "";
  const sorted = useMemo(
    () => sortBudgetAccounts(accounts.data ?? [], mainAccountId, i18n.language),
    [accounts.data, mainAccountId, i18n.language],
  );
  const usedAccountIds = new Set(withTransactions.data ?? []);
  // Unknown until loaded: locked, so nothing is offered that may turn out impossible
  const mainCurrencyLocked = !withTransactions.isSuccess || usedAccountIds.size > 0;

  const run = async (write: () => Promise<void>) => {
    try {
      await write();
    } catch (error) {
      if (error instanceof Error) {
        showWriteError(error, { retry: () => void run(write), fallbackKey: "toasts.budget.accountSaveError" });
      }
    }
  };
  const setHidden = (account: BudgetAccount, hidden: boolean) =>
    run(() => updateAccount({ accountId: account.id, changes: { hidden } }));

  if (profile.isPending || accounts.isPending) return <LoadingFallback />;
  if (profile.isError || accounts.isError || !profile.data) {
    return <EmptyState title={t("errors.fetchError", { ns: "common" })} />;
  }

  const mainCurrency = profile.data.mainCurrency;

  return (
    <section className={styles.root} aria-labelledby="budget-accounts-title">
      <div className={styles.header}>
        <h2 id="budget-accounts-title" className={styles.title}>
          {t("budget.accounts.title")}
        </h2>
        <Button variant="outline" onClick={() => setDialog({ mode: "add" })} disabled={!isOnline}>
          <Plus aria-hidden="true" />
          {t("budget.accounts.add")}
        </Button>
      </div>

      <Card padding="none">
        <ul className={styles.list}>
          {sorted.map((account) => {
            const isMain = account.id === mainAccountId;
            return (
              <ListItem
                key={account.id}
                asChild
                leading={<Wallet aria-hidden="true" />}
                title={
                  <span className={styles.nameLine}>
                    <span className={styles.name}>{account.name}</span>
                    {isMain && (
                      <Badge variant="brand" size="md">
                        {t("budget.accounts.main")}
                      </Badge>
                    )}
                    {account.hidden && (
                      <Badge variant="neutral" size="md">
                        {t("budget.accounts.hidden")}
                      </Badge>
                    )}
                  </span>
                }
                description={account.defaultCurrency}
                trailing={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("budget.accounts.actions", { name: account.name })}
                        disabled={!isOnline}
                      >
                        <MoreHorizontal aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className={styles.menu}>
                      <DropdownMenuItem onClick={() => setDialog({ mode: "edit", account })}>
                        <Pencil aria-hidden="true" />
                        {t("budget.accounts.edit")}
                      </DropdownMenuItem>
                      {/* The main account is never hidden or deleted, and a hidden account never made main */}
                      {!isMain && (
                        <>
                          {!account.hidden && (
                            <DropdownMenuItem onClick={() => void run(() => setMainAccount(account.id))}>
                              <Star aria-hidden="true" />
                              {t("budget.accounts.makeMain")}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => void setHidden(account, !account.hidden)}>
                            {account.hidden ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                            {t(account.hidden ? "budget.accounts.show" : "budget.accounts.hide")}
                          </DropdownMenuItem>
                          <DropdownMenuItem className={styles.destructiveItem} onClick={() => setToDelete(account)}>
                            <Trash2 aria-hidden="true" />
                            {t("budget.accounts.delete.action")}
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              >
                <li />
              </ListItem>
            );
          })}
        </ul>
      </Card>
      <p className={styles.footnote}>{t("budget.accounts.hiddenHint")}</p>

      <Card className={styles.currencyCard}>
        <Select
          label={t("budget.accounts.mainCurrency.label")}
          description={t(
            mainCurrencyLocked ? "budget.accounts.mainCurrency.locked" : "budget.accounts.mainCurrency.editable",
          )}
          options={currencyOptions}
          value={currencyOptions.find(({ value }) => value === mainCurrency) ?? null}
          formatOptionLabel={showCode}
          onChange={(option) => {
            if (option && option.value !== mainCurrency) void run(() => setMainCurrency(option.value));
          }}
          disabled={mainCurrencyLocked || !isOnline || isSettingCurrency}
        />
      </Card>

      <BudgetAccountDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        account={dialog?.mode === "edit" ? dialog.account : undefined}
        defaultCurrency={mainCurrency}
        currencyLocked={dialog?.mode === "edit" && (!withTransactions.isSuccess || usedAccountIds.has(dialog.account.id))}
        saveDisabled={!isOnline}
      />
      <DeleteBudgetAccountDialog
        account={toDelete}
        onClose={() => setToDelete(null)}
        onHide={(account) => {
          setToDelete(null);
          void setHidden(account, true);
        }}
        actionsDisabled={!isOnline}
      />
    </section>
  );
};
