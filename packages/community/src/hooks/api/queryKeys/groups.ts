// Groups query keys — the only place that builds them.
// Everything about a group (document, members, join requests, pending invitations, the signed-in user's
// own request) and the user's groups / invitations is listener-backed, so writes do not invalidate those:
// the listeners deliver the change (invalidating them only refetched data the listener had already pushed).
// Only the global group search is fetched.
// A write that gives the signed-in user access (create, join, accept) needs no refetch either:
// `subscribeToUserGroups` starts a group's listeners only once the server has confirmed the membership (#106).
export const groupKeys = {
  group: (groupId: string) => ["groups", "detail", groupId],
  members: (groupId: string) => [...groupKeys.group(groupId), "members"],
  requests: (groupId: string) => [...groupKeys.group(groupId), "requests"],
  pendingInvitations: (groupId: string) => [...groupKeys.group(groupId), "pendingInvitations"],
  userRequest: (groupId: string, uid: string) => [...groupKeys.group(groupId), "userRequest", uid],
  userGroups: (uid: string) => ["groups", "user", uid],
  userInvitations: (uid: string) => ["groups", "userInvitations", uid],
  /** Every global search (any query); a search result shows the group's name / avatar / visibility. */
  searchAll: () => ["groups", "search"],
  search: (searchQuery: string) => [...groupKeys.searchAll(), searchQuery],
};

/** Which keys each group write makes stale (`useUserMutation({ invalidates })`). Writes not listed invalidate nothing. */
export const groupInvalidation = {
  createGroup: () => [groupKeys.searchAll()],
  updateGroup: () => [groupKeys.searchAll()],
  deleteGroup: () => [groupKeys.searchAll()],
};
