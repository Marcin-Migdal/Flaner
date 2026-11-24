import type { BudgetAccount } from "../../api/budget";

/** Accounts as Settings and every account select list them: the main account first, the rest alphabetically. */
export const sortBudgetAccounts = (accounts: BudgetAccount[], mainAccountId: string, locale: string): BudgetAccount[] => {
  const collator = new Intl.Collator(locale, { sensitivity: "base" });
  return [...accounts].sort(
    (a, b) => Number(b.id === mainAccountId) - Number(a.id === mainAccountId) || collator.compare(a.name, b.name),
  );
};
