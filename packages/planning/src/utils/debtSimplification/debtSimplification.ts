export type Debt = {
  from: string;
  to: string;
  amount: number;
  currency: string;
};

type BalanceEntry = {
  id: string;
  amount: number;
};

/**
 * Reduces net balances of a single currency (in minor units) to a small set of transfers.
 * Greedy matching of the largest debtor with the largest creditor yields at most n - 1 transfers.
 */
export const calculateSimplifiedDebts = (balances: Record<string, number>, currency: string): Debt[] => {
  const debtors: BalanceEntry[] = [];
  const creditors: BalanceEntry[] = [];

  Object.entries(balances).forEach(([id, balance]) => {
    if (balance < 0) {
      debtors.push({ id, amount: -balance });
    } else if (balance > 0) {
      creditors.push({ id, amount: balance });
    }
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const debts: Debt[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const settledAmount = Math.min(debtor.amount, creditor.amount);

    debts.push({ from: debtor.id, to: creditor.id, amount: settledAmount, currency });

    debtor.amount -= settledAmount;
    creditor.amount -= settledAmount;

    if (debtor.amount === 0) debtorIndex++;
    if (creditor.amount === 0) creditorIndex++;
  }

  return debts;
};
