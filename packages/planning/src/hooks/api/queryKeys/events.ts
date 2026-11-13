// Scheduler events query keys. The user's events are listener-backed, so no event write
// (create / update / vote / finalize / delete) invalidates anything: the listener delivers it.
export const eventKeys = {
  userEvents: (uid: string) => ["events", "user", uid],
};
