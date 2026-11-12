// Splits query keys — the only place that builds them.
// - `userGroups` is listener-backed: the group documents (balances, counters, `updatedAt`) arrive by themselves.
// - `expenses` / `settlements` (the group feed) are fetched. Every split write — expense, settlement, currency
//   conversion, participants, settings — goes through a transaction that bumps the group's `updatedAt`,
//   so `useSyncSplitGroupFeed` refetches the feed once when the listener delivers it.
// Therefore no split mutation invalidates anything (a mutation-side invalidation would fetch the feed twice).
export const splitKeys = {
  userGroups: (uid: string) => ["splits", "userGroups", uid],
  expenses: (groupId: string) => ["splits", "group", groupId, "expenses"],
  settlements: (groupId: string) => ["splits", "group", groupId, "settlements"],
};

/** Keys made stale by a change of the (listener-backed) group document, see `useSyncSplitGroupFeed`. */
export const splitInvalidation = {
  groupUpdated: (groupId: string) => [splitKeys.expenses(groupId), splitKeys.settlements(groupId)],
  expensesCountChanged: (groupId: string) => [splitKeys.expenses(groupId)],
  settlementsCountChanged: (groupId: string) => [splitKeys.settlements(groupId)],
};
