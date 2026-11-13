// Notification query keys. Unread notifications come from a Firestore listener held in `useNotifications`
// (local state, not the query cache); the read history is a fetched, paginated query.
export const notificationKeys = {
  read: (uid: string) => ["notifications", "read", uid],
  /** Where each notification type links to, from the MFEs (not user data, loaded once). */
  targets: () => ["notifications", "targets"],
};

/** Keys made stale by a notification write. */
export const notificationInvalidation = {
  // Marking as read moves notifications into the read history
  markAsRead: (uid: string) => [notificationKeys.read(uid)],
};
